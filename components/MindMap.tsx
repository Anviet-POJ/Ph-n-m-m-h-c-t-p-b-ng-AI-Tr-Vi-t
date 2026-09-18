
import React, { useState, useEffect, useRef } from 'react';
import { MindMapNode } from '../types';
import { MathText } from './MarkdownRenderer';

const NODE_WIDTH = 280;
const NODE_HEIGHT = 130;
const HORIZONTAL_SEPARATION = 330;
const VERTICAL_SEPARATION = 30;

const scrollbarHideStyle = `
.hide-scrollbars::-webkit-scrollbar {
    display: none;
}
.hide-scrollbars {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
}
`;

interface LayoutNode {
  node: MindMapNode;
  x: number;
  y: number;
  level: number;
}

interface LayoutLink {
  source: { x: number; y: number };
  target: { x: number; y: number };
}

const KatexRenderer: React.FC<{ text: string, className: string }> = ({ text, className }) => {
    // Defensive cleanup for any repetitive loops
    let displayText = text || '';
    displayText = displayText.replace(/(?:nhất có thể|xuất sắc nhất|chuẩn mực nhất|tối ưu nhất|tuyệt đỉnh nhất|đỉnh cao nhất|hoàn chỉnh nhất|chuẩn xác nhất|logic nhất)\s*/gi, '');
    displayText = displayText.replace(/\b(\S+(?:\s+\S+){0,3})\s+\1\b/gi, '$1');
    displayText = displayText.replace(/\b(\S+(?:\s+\S+){0,3})\s+\1\b/gi, '$1').trim();
    if (!displayText) displayText = text;

    return (
        <h4 className={className}>
            <MathText text={displayText} />
        </h4>
    );
};

const MindMapComponent: React.FC<{ data: MindMapNode }> = ({ data }) => {
    const [layout, setLayout] = useState<{ nodes: LayoutNode[]; links: LayoutLink[]; width: number; height: number } | null>(null);
    
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const isPanning = useRef(false);
    const startX = useRef(0);
    const startY = useRef(0);
    const scrollLeftStart = useRef(0);
    const scrollTopStart = useRef(0);

    useEffect(() => {
        if (!data || !data.title) {
            setLayout(null);
            return;
        }
        const nodes: LayoutNode[] = [];
        const nodeMap = new Map<MindMapNode, { y: number; subtreeHeight: number }>();

        // 1. Post-order traversal to calculate subtree heights and initial Y
        function calculateInitialY(node: MindMapNode): number {
            if (!node) return 0;
            let subtreeHeight = 0;
            if (!node.children || node.children.length === 0) {
                subtreeHeight = NODE_HEIGHT + VERTICAL_SEPARATION;
            } else {
                node.children.forEach(child => {
                    if (child) subtreeHeight += calculateInitialY(child);
                });
            }
            nodeMap.set(node, { y: 0, subtreeHeight });
            return subtreeHeight;
        }
        
        const totalHeight = calculateInitialY(data);

        // 2. Pre-order traversal to set final coordinates
        function calculateFinalLayout(node: MindMapNode, level: number, yOffset: number): number {
            if (!node) return yOffset;
            const nodeInfo = nodeMap.get(node) || { y: 0, subtreeHeight: NODE_HEIGHT + VERTICAL_SEPARATION };
            const x = level * HORIZONTAL_SEPARATION;
            let y = 0;

            if (!node.children || node.children.length === 0) {
                y = yOffset + nodeInfo.subtreeHeight / 2;
            } else {
                 let childYOffset = yOffset;
                 const childCenters: number[] = [];
                 node.children.forEach(child => {
                    if (child) {
                        const childLayoutY = calculateFinalLayout(child, level + 1, childYOffset);
                        childCenters.push(childLayoutY);
                        childYOffset += (nodeMap.get(child)?.subtreeHeight || (NODE_HEIGHT + VERTICAL_SEPARATION));
                    }
                 });
                 y = childCenters.length > 0 ? (childCenters[0] + childCenters[childCenters.length - 1]) / 2 : yOffset;
            }
            
            nodes.push({ node, x, y, level });
            nodeMap.set(node, { ...nodeInfo, y });
            return y;
        }

        calculateFinalLayout(data, 0, 0);

        if (nodes.length === 0) {
            setLayout(null);
            return;
        }

        // 3. Create links
        const links: LayoutLink[] = [];
        nodes.forEach(source => {
            if (source.node.children) {
                source.node.children.forEach(childNode => {
                    const target = nodes.find(n => n.node === childNode);
                    if (target) {
                        links.push({
                            // Overlap slightly with nodes to ensure connection
                            source: { x: source.x + NODE_WIDTH - 20, y: source.y },
                            target: { x: target.x + 20, y: target.y },
                        });
                    }
                });
            }
        });

        // 4. Calculate SVG dimensions
        const maxX = Math.max(...nodes.map(n => n.x)) + NODE_WIDTH;
        const width = Math.max(maxX + 40, 600);
        const height = Math.max(totalHeight + 40, 400);

        setLayout({ nodes, links, width, height });

    }, [data]);
    
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!scrollContainerRef.current) return;
        isPanning.current = true;
        startX.current = e.pageX - scrollContainerRef.current.offsetLeft;
        startY.current = e.pageY - scrollContainerRef.current.offsetTop;
        scrollLeftStart.current = scrollContainerRef.current.scrollLeft;
        scrollTopStart.current = scrollContainerRef.current.scrollTop;
        scrollContainerRef.current.style.cursor = 'grabbing';
        scrollContainerRef.current.style.userSelect = 'none';
    };

    const handleMouseUpAndLeave = () => {
        isPanning.current = false;
        if (scrollContainerRef.current) {
            scrollContainerRef.current.style.cursor = 'grab';
            scrollContainerRef.current.style.userSelect = 'auto';
        }
    };
    
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isPanning.current || !scrollContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const y = e.pageY - scrollContainerRef.current.offsetTop;
        const walkX = (x - startX.current);
        const walkY = (y - startY.current);
        scrollContainerRef.current.scrollLeft = scrollLeftStart.current - walkX;
        scrollContainerRef.current.scrollTop = scrollTopStart.current - walkY;
    };
    
    if (!layout) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    const { nodes, links, width, height } = layout;

    const getPath = (link: LayoutLink) => {
        const { source, target } = link;
        const controlX1 = source.x + (target.x - source.x) * 0.5;
        const controlY1 = source.y;
        const controlX2 = source.x + (target.x - source.x) * 0.5;
        const controlY2 = target.y;
        return `M ${source.x},${source.y} C ${controlX1},${controlY1} ${controlX2},${controlY2} ${target.x},${target.y}`;
    };

     const levelColors = [
        'from-indigo-600 to-purple-600',
        'from-sky-600 to-cyan-600',
        'from-emerald-500 to-lime-500',
        'from-amber-500 to-orange-500',
    ];

    return (
        <div 
            ref={scrollContainerRef}
            className="p-4 bg-slate-100/90 rounded-lg relative overflow-auto mind-map-container hide-scrollbars cursor-grab"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUpAndLeave}
            onMouseLeave={handleMouseUpAndLeave}
            onMouseMove={handleMouseMove}
        >
            <style>{`
                ${scrollbarHideStyle}
                .mind-map-node {
                    animation: node-appear 0.5s ease-out forwards;
                    opacity: 0;
                    transform-origin: center;
                }
                @keyframes node-appear {
                    from { opacity: 0; transform: scale(0.5); }
                    to { opacity: 1; transform: scale(1); }
                }
                .mind-map-link {
                    animation: link-appear 1s ease-out forwards;
                    stroke-dasharray: 5000;
                    stroke-dashoffset: 5000;
                }
                @keyframes link-appear {
                    to { stroke-dashoffset: 0; }
                }
            `}</style>
            <svg width={width} height={height} className="font-sans">
                <defs>
                    <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style={{ stopColor: '#818cf8' }} />
                        <stop offset="100%" style={{ stopColor: '#a855f7' }} />
                    </linearGradient>
                </defs>
                <g transform="translate(20, 20)">
                    {/* Links */}
                    <g>
                        {links.map((link, i) => (
                            <path
                                key={i}
                                d={getPath(link)}
                                className="mind-map-link"
                                stroke="url(#line-gradient)"
                                strokeWidth="3"
                                fill="none"
                                style={{ animationDelay: `${i * 100}ms` }}
                            />
                        ))}
                    </g>
                    {/* Nodes */}
                    <g>
                        {nodes.map(({ node, x, y, level }, i) => (
                            <foreignObject 
                                key={i} 
                                x={x} y={y - NODE_HEIGHT / 2} 
                                width={NODE_WIDTH} height={NODE_HEIGHT} 
                                className="mind-map-node"
                                style={{ animationDelay: `${i * 50}ms` }}
                            >
                                <div className={`w-full h-full p-3 rounded-xl shadow-2xl flex flex-col items-center justify-center text-center bg-gradient-to-br ${levelColors[level % levelColors.length]} transform transition-transform duration-300 hover:scale-105 hover:shadow-purple-500/50 border-2 border-transparent overflow-y-auto hide-scrollbars`}>
                                    <KatexRenderer text={node.title} className="font-bold text-white text-xs sm:text-sm leading-snug break-words whitespace-pre-wrap max-h-full" />
                                </div>
                            </foreignObject>
                        ))}
                    </g>
                </g>
            </svg>
        </div>
    );
};

export default MindMapComponent;
