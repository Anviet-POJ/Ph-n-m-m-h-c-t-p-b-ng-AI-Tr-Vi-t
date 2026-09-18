






import React, { useState } from 'react';
import { LOCALIZATION_STRINGS } from '../constants';
import { Language, User, AdminUser, AdminRole } from '../types';

interface AdminDashboardProps {
    currentAdmin: AdminUser;
    allAdmins: AdminUser[];
    users: User[];
    onUnlockUser: (username: string) => void;
    onLockUser: (username: string, durationMs: number) => void;
    onDeleteUser: (username: string) => void;
    onRestoreUser: (username: string) => void;
    onUpdateAdminCredentials: (username: string, newUsername: string, newPass: string) => void;
    onCreateAdmin: (username: string, pass: string) => void;
    onDeleteAdmin: (username: string) => void;
    onLogout: () => void;
    language: Language;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
    currentAdmin, allAdmins, users, 
    onUnlockUser, onLockUser, onDeleteUser, onRestoreUser,
    onUpdateAdminCredentials, onCreateAdmin, onDeleteAdmin,
    onLogout, language 
}) => {
    const defaultLang = Language.VI;
    const t = (key: string) => LOCALIZATION_STRINGS[defaultLang]?.[key] || LOCALIZATION_STRINGS[Language.EN][key];
    
    const [activeTab, setActiveTab] = useState<'users' | 'deleted_users' | 'admins' | 'logs'>('users');
    
    // Profile update states
    const [newAdminUsername, setNewAdminUsername] = useState(currentAdmin.username);
    const [newAdminPass, setNewAdminPass] = useState(currentAdmin.password);
    const [passMessage, setPassMessage] = useState('');

    // Create Admin states
    const [createAdminName, setCreateAdminName] = useState('');
    const [createAdminPass, setCreateAdminPass] = useState('');
    const [createMessage, setCreateMessage] = useState('');

    // Edit Admin (by Super Admin) states
    const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
    const [editAdminUsername, setEditAdminUsername] = useState('');
    const [editAdminPass, setEditAdminPass] = useState('');

    const [selectedUserToLock, setSelectedUserToLock] = useState<string | null>(null);

    const handleSelfUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (newAdminPass.trim() && newAdminUsername.trim()) {
            onUpdateAdminCredentials(currentAdmin.username, newAdminUsername, newAdminPass);
            setPassMessage(t('password_changed'));
            setTimeout(() => setPassMessage(''), 3000);
        }
    };

    const handleCreateAdminSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!createAdminName.trim() || !createAdminPass.trim()) return;
        if (allAdmins.some(a => a.username === createAdminName)) {
            setCreateMessage(t('admin_exists'));
            return;
        }
        onCreateAdmin(createAdminName, createAdminPass);
        setCreateAdminName('');
        setCreateAdminPass('');
        setCreateMessage(t('create_admin_success'));
        setTimeout(() => setCreateMessage(''), 3000);
    };
    
    const handleEditAdminSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAdmin || !editAdminUsername.trim() || !editAdminPass.trim()) return;
        onUpdateAdminCredentials(editingAdmin.username, editAdminUsername, editAdminPass);
        setEditingAdmin(null);
    };

    const handleLockConfirm = (durationMs: number) => {
        if (selectedUserToLock) {
            onLockUser(selectedUserToLock, durationMs);
            setSelectedUserToLock(null);
        }
    };
    
    // Filter active users (not deleted)
    const activeUsers = users.filter(u => !u.isDeleted);
    // Filter deleted users
    const deletedUsers = users.filter(u => u.isDeleted);

    return (
        <div className="min-h-screen bg-slate-100 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-indigo-800">{t('admin_dashboard')}</h1>
                        <p className="text-slate-600">
                            Welcome, <span className="font-semibold text-indigo-600">{currentAdmin.username}</span> 
                            ({currentAdmin.role === AdminRole.SUPER_ADMIN ? t('super_admin') : t('normal_admin')})
                        </p>
                    </div>
                    <button onClick={onLogout} className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors">
                        {t('logout')}
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex space-x-4 border-b border-slate-300 mb-6">
                     <button 
                        onClick={() => setActiveTab('users')}
                        className={`pb-3 px-4 font-medium ${activeTab === 'users' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}
                    >
                        {t('user_list')}
                    </button>
                    {currentAdmin.role === AdminRole.SUPER_ADMIN && (
                        <>
                             <button 
                                onClick={() => setActiveTab('deleted_users')}
                                className={`pb-3 px-4 font-medium ${activeTab === 'deleted_users' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}
                            >
                                {t('deleted_users')}
                            </button>
                            <button 
                                onClick={() => setActiveTab('admins')}
                                className={`pb-3 px-4 font-medium ${activeTab === 'admins' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}
                            >
                                {t('admin_management')}
                            </button>
                            <button 
                                onClick={() => setActiveTab('logs')}
                                className={`pb-3 px-4 font-medium ${activeTab === 'logs' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}
                            >
                                {t('audit_logs')}
                            </button>
                        </>
                    )}
                </div>

                {/* --- USER MANAGEMENT TAB --- */}
                {activeTab === 'users' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className={`${currentAdmin.role === AdminRole.SUPER_ADMIN ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white rounded-xl shadow-md overflow-hidden`}>
                            <div className="p-6 border-b border-slate-200">
                                <h2 className="text-xl font-semibold text-slate-800">{t('user_list')}</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="bg-slate-50 text-slate-700 uppercase font-medium">
                                        <tr>
                                            <th className="px-6 py-3">{t('username')}</th>
                                            <th className="px-6 py-3">{t('status')}</th>
                                            <th className="px-6 py-3">{t('current_feature')}</th>
                                            <th className="px-6 py-3">{t('last_activity')}</th>
                                            <th className="px-6 py-3 text-right">{t('actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {activeUsers.map(user => (
                                            <tr key={user.username} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 font-medium text-slate-900">{user.username}</td>
                                                <td className="px-6 py-4">
                                                    {user.isLocked ? (
                                                        <div>
                                                            <span className="px-2 py-1 text-xs font-bold text-red-700 bg-red-100 rounded-full">{t('locked')}</span>
                                                            {user.lockedBy && <div className="text-xs text-slate-500 mt-1">by {user.lockedBy}</div>}
                                                        </div>
                                                    ) : (
                                                        <span className="px-2 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-full">{t('active')}</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500">{user.currentFeature || '-'}</td>
                                                <td className="px-6 py-4 text-slate-500 truncate max-w-xs">{user.lastActivity || '-'}</td>
                                                <td className="px-6 py-4 text-right space-x-2">
                                                    {user.isLocked ? (
                                                        <button onClick={() => onUnlockUser(user.username)} className="text-green-600 hover:text-green-800 font-medium">
                                                            {t('unlock')}
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => setSelectedUserToLock(user.username)} className="text-amber-600 hover:text-amber-800 font-medium">
                                                            {t('lock')}
                                                        </button>
                                                    )}
                                                    <button onClick={() => { if (window.confirm(t('confirm_delete_user'))) onDeleteUser(user.username); }} className="text-red-600 hover:text-red-800 font-medium ml-2">
                                                        {t('delete')}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {activeUsers.length === 0 && (
                                            <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No active users found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Profile Update Section (ONLY SUPER ADMIN) */}
                        {currentAdmin.role === AdminRole.SUPER_ADMIN && (
                            <div className="bg-white rounded-xl shadow-md p-6 h-fit">
                                <h2 className="text-lg font-semibold text-slate-800 mb-4">{t('change_admin_password')}</h2>
                                <form onSubmit={handleSelfUpdate} className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">{t('username')}</label>
                                        <input 
                                            type="text" 
                                            value={newAdminUsername} 
                                            onChange={(e) => setNewAdminUsername(e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">{t('new_password')}</label>
                                        <input 
                                            type="password" 
                                            value={newAdminPass} 
                                            onChange={(e) => setNewAdminPass(e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            required
                                        />
                                    </div>
                                    <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                                        {t('save_password')}
                                    </button>
                                </form>
                                {passMessage && <p className="text-green-600 mt-2 text-sm font-medium text-center">{passMessage}</p>}
                            </div>
                        )}
                    </div>
                )}

                {/* --- DELETED USERS TAB (SUPER ADMIN ONLY) --- */}
                {activeTab === 'deleted_users' && currentAdmin.role === AdminRole.SUPER_ADMIN && (
                     <div className="bg-white rounded-xl shadow-md overflow-hidden">
                        <div className="p-6 border-b border-slate-200">
                            <h2 className="text-xl font-semibold text-slate-800">{t('deleted_users')}</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-slate-700 uppercase font-medium">
                                    <tr>
                                        <th className="px-6 py-3">{t('username')}</th>
                                        <th className="px-6 py-3">{t('deleted_by')}</th>
                                        <th className="px-6 py-3 text-right">{t('actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {deletedUsers.map(user => (
                                        <tr key={user.username} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 font-medium text-slate-900">{user.username}</td>
                                            <td className="px-6 py-4 font-medium text-red-600">{user.deletedBy || '-'}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => onRestoreUser(user.username)} className="text-blue-600 hover:text-blue-800 font-medium px-3 py-1 bg-blue-50 rounded hover:bg-blue-100 transition-colors">
                                                    {t('restore')}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {deletedUsers.length === 0 && (
                                        <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">No deleted users.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- ADMIN MANAGEMENT TAB (SUPER ADMIN ONLY) --- */}
                {activeTab === 'admins' && currentAdmin.role === AdminRole.SUPER_ADMIN && (
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white rounded-xl shadow-md overflow-hidden">
                            <div className="p-6 border-b border-slate-200">
                                <h2 className="text-xl font-semibold text-slate-800">{t('admin_management')}</h2>
                            </div>
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-slate-700 uppercase font-medium">
                                    <tr>
                                        <th className="px-6 py-3">{t('username')}</th>
                                        <th className="px-6 py-3">{t('role')}</th>
                                        <th className="px-6 py-3">{t('password')}</th>
                                        <th className="px-6 py-3 text-right">{t('actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {allAdmins.map(admin => (
                                        <tr key={admin.username} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 font-medium text-slate-900">
                                                {admin.username} {admin.username === currentAdmin.username && '(You)'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 text-xs font-bold rounded-full ${admin.role === AdminRole.SUPER_ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {admin.role === AdminRole.SUPER_ADMIN ? t('super_admin') : t('normal_admin')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs">{admin.password}</td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button 
                                                    onClick={() => { setEditingAdmin(admin); setEditAdminUsername(admin.username); setEditAdminPass(admin.password); }}
                                                    className="text-indigo-600 hover:text-indigo-800 font-medium"
                                                >
                                                    Edit
                                                </button>
                                                {admin.role !== AdminRole.SUPER_ADMIN && (
                                                    <button 
                                                        onClick={() => { if (window.confirm(t('confirm_delete_admin'))) onDeleteAdmin(admin.username); }}
                                                        className="text-red-600 hover:text-red-800 font-medium ml-2"
                                                    >
                                                        {t('delete')}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-white rounded-xl shadow-md p-6 h-fit">
                            <h2 className="text-lg font-semibold text-slate-800 mb-4">{t('create_admin')}</h2>
                            <form onSubmit={handleCreateAdminSubmit} className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">{t('username')}</label>
                                    <input 
                                        type="text" 
                                        value={createAdminName} 
                                        onChange={(e) => setCreateAdminName(e.target.value)}
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">{t('password')}</label>
                                    <input 
                                        type="password" 
                                        value={createAdminPass} 
                                        onChange={(e) => setCreateAdminPass(e.target.value)}
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        required
                                    />
                                </div>
                                <button type="submit" className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                                    {t('create_admin')}
                                </button>
                            </form>
                             {createMessage && <p className={`mt-2 text-sm font-medium text-center ${createMessage.includes('success') ? 'text-green-600' : 'text-red-500'}`}>{createMessage}</p>}
                        </div>
                     </div>
                )}

                 {/* --- AUDIT LOGS TAB (SUPER ADMIN ONLY) --- */}
                 {activeTab === 'logs' && currentAdmin.role === AdminRole.SUPER_ADMIN && (
                    <div className="bg-white rounded-xl shadow-md overflow-hidden">
                        <div className="p-6 border-b border-slate-200">
                            <h2 className="text-xl font-semibold text-slate-800">{t('audit_logs')}</h2>
                        </div>
                        <div className="overflow-x-auto">
                             <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-slate-700 uppercase font-medium">
                                    <tr>
                                        <th className="px-6 py-3">{t('log_timestamp')}</th>
                                        <th className="px-6 py-3">Admin</th>
                                        <th className="px-6 py-3">{t('log_action')}</th>
                                        <th className="px-6 py-3">{t('log_target')}</th>
                                        <th className="px-6 py-3">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {allAdmins.flatMap(admin => admin.logs).sort((a, b) => b.timestamp - a.timestamp).map(log => (
                                         <tr key={log.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                            <td className="px-6 py-4 font-medium text-indigo-600">{log.adminUsername}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                                                    log.action.includes('delete') ? 'bg-red-100 text-red-700' :
                                                    log.action.includes('lock') ? 'bg-amber-100 text-amber-700' :
                                                    log.action.includes('restore') ? 'bg-green-100 text-green-700' :
                                                    'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium">{log.target}</td>
                                            <td className="px-6 py-4 text-slate-500">{log.details || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                 )}
            </div>

            {/* Lock Duration Modal */}
            {selectedUserToLock && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">{t('select_lock_duration')}</h3>
                        <p className="mb-4 text-slate-600">Locking user: <span className="font-semibold">{selectedUserToLock}</span></p>
                        <div className="space-y-2">
                            <button onClick={() => handleLockConfirm(15 * 60 * 1000)} className="w-full p-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-left">{t('duration_15m')}</button>
                            <button onClick={() => handleLockConfirm(60 * 60 * 1000)} className="w-full p-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-left">{t('duration_1h')}</button>
                            <button onClick={() => handleLockConfirm(24 * 60 * 60 * 1000)} className="w-full p-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-left">{t('duration_1d')}</button>
                            <button onClick={() => handleLockConfirm(3 * 24 * 60 * 60 * 1000)} className="w-full p-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-left">{t('duration_3d')}</button>
                            <button onClick={() => handleLockConfirm(7 * 24 * 60 * 60 * 1000)} className="w-full p-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-left">{t('duration_7d')}</button>
                            <button onClick={() => handleLockConfirm(30 * 24 * 60 * 60 * 1000)} className="w-full p-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-left">{t('duration_30d')}</button>
                            <button onClick={() => handleLockConfirm(100 * 365 * 24 * 60 * 60 * 1000)} className="w-full p-3 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-left font-semibold">{t('duration_permanent')}</button>
                        </div>
                        <button onClick={() => setSelectedUserToLock(null)} className="mt-4 w-full py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">
                            {t('cancel')}
                        </button>
                    </div>
                </div>
            )}

             {/* Edit Admin Modal */}
             {editingAdmin && (
                 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Edit Admin: {editingAdmin.username}</h3>
                        <form onSubmit={handleEditAdminSubmit} className="space-y-3">
                             <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">{t('new_username')}</label>
                                <input 
                                    type="text" 
                                    value={editAdminUsername} 
                                    onChange={(e) => setEditAdminUsername(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">{t('new_password')}</label>
                                <input 
                                    type="password" 
                                    value={editAdminPass} 
                                    onChange={(e) => setEditAdminPass(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button type="button" onClick={() => setEditingAdmin(null)} className="flex-1 py-2 bg-slate-200 rounded-lg text-slate-700">{t('cancel')}</button>
                                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg">{t('save_password')}</button>
                            </div>
                        </form>
                    </div>
                </div>
             )}
        </div>
    );
};

export default AdminDashboard;