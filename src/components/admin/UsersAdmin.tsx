import React, { useEffect, useState } from 'react';
import { projectId } from '../../utils/supabase/info';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Plus, Trash2, Shield, Search, Users as UsersIcon, Loader2, Mail, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';

export function UsersAdmin() {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { accessToken } = useAuth();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(user =>
          user.email?.toLowerCase().includes(query) ||
          user.user_metadata?.name?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, users]);

  async function loadUsers() {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/users`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      const data = await response.json();
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(newUser)
        }
      );

      if (response.ok) {
        setNewUser({ email: '', password: '', name: '' });
        setIsDialogOpen(false);
        loadUsers();
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao criar usuário');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Erro ao criar usuário');
    }
  }

  async function deleteUser(id: string, email: string) {
    if (email === 'feckzindev@gmail.com') {
      alert('Não é possível excluir o administrador principal');
      return;
    }

    if (!confirm(`Deseja excluir o usuário ${email}?`)) return;

    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/users/${id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  }

  async function toggleAdmin(userId: string, email: string, currentIsAdmin: boolean) {
    if (email === 'feckzindev@gmail.com') {
      alert('Não é possível modificar o administrador principal');
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/users/${userId}/admin`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ isAdmin: !currentIsAdmin })
        }
      );
      
      if (response.status === 404) {
        alert('Recurso de administração não disponível. Aguarde atualização do servidor.');
        return;
      }
      
      if (response.ok) {
        // Try to parse JSON, but handle cases where response might not be JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          await response.json();
        }
        loadUsers();
      } else {
        // Handle error responses
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          alert(error.error || 'Erro ao modificar permissões de administrador');
        } else {
          const errorText = await response.text();
          console.error('Non-JSON error response:', errorText);
          alert('Erro ao modificar permissões de administrador. Por favor, tente novamente mais tarde.');
        }
      }
    } catch (error) {
      console.error('Error toggling admin:', error);
      alert('Erro ao modificar permissões de administrador. Verifique sua conexão.');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Carregando usuários...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl text-white mb-1.5">Usuários</h2>
          <p className="text-sm text-gray-500">Gerencie todos os usuários e suas permissões</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg h-10 px-5 gap-2 shadow-lg shadow-blue-500/20 transition-all duration-300 hover:shadow-blue-500/30 flex-shrink-0">
              <Plus className="w-4 h-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 rounded-xl max-w-md overflow-hidden">
            <DialogHeader>
              <DialogTitle className="text-xl text-white">Criar Novo Usuário</DialogTitle>
              <p className="text-sm text-gray-500 mt-1">Preencha os dados do novo usuário</p>
            </DialogHeader>
            <form onSubmit={createUser} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs text-gray-400 uppercase tracking-wider">Nome</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  <Input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    required
                    className="pl-10 bg-zinc-800 border-zinc-700 text-white h-10 rounded-lg"
                    placeholder="Nome completo"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs text-gray-400 uppercase tracking-wider">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  <Input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    required
                    className="pl-10 bg-zinc-800 border-zinc-700 text-white h-10 rounded-lg"
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs text-gray-400 uppercase tracking-wider">Senha</label>
                <Input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white h-10 rounded-lg"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white h-11 rounded-lg shadow-lg shadow-blue-500/20 transition-all duration-300 hover:shadow-blue-500/30">
                Criar Usuário
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Busca */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        <Input
          placeholder="Buscar por e-mail ou nome..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-zinc-900/30 border-zinc-800 text-white h-10 rounded-lg"
        />
      </div>

      {/* Lista de Usuários */}
      <div className="space-y-3 w-full">
        {filteredUsers.map((user) => {
          const isMainAdmin = user.email === 'feckzindev@gmail.com';
          const isAdmin = user.user_metadata?.isAdmin || isMainAdmin;
          
          return (
            <div 
              key={user.id} 
              className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-4 hover:bg-zinc-900/50 hover:border-zinc-700/50 transition-all duration-200 group w-full"
            >
              <div className="flex items-start gap-3 flex-col sm:flex-row sm:items-center">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-blue-500" />
                </div>
                
                <div className="flex-1 min-w-0 w-full sm:w-auto">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm text-white break-all">
                      {user.user_metadata?.name || 'Sem nome'}
                    </h3>
                    {isMainAdmin && (
                      <div className="flex items-center gap-1 bg-blue-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
                        <Shield className="w-3 h-3 text-blue-400" />
                        <span className="text-xs text-blue-400">Admin Principal</span>
                      </div>
                    )}
                    {isAdmin && !isMainAdmin && (
                      <div className="flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded-full flex-shrink-0">
                        <Shield className="w-3 h-3 text-blue-400" />
                        <span className="text-xs text-blue-400">Admin</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="text-gray-400 break-all">{user.email}</span>
                    <span className="text-gray-700 flex-shrink-0">•</span>
                    <span className="text-gray-600 flex-shrink-0">
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
                
                {!isMainAdmin && (
                  <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                    <Button
                      onClick={() => toggleAdmin(user.id, user.email, user.user_metadata?.isAdmin)}
                      variant="outline"
                      size="sm"
                      className={`border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 h-9 px-3 rounded-lg transition-all duration-200 flex-1 sm:flex-none ${
                        isAdmin ? 'bg-blue-500/10 border-blue-500/30' : ''
                      }`}
                      title={isAdmin ? 'Remover admin' : 'Tornar admin'}
                    >
                      <Shield className={`w-4 h-4 ${isAdmin ? 'text-blue-400' : 'text-gray-400'}`} />
                      <span className="ml-2 text-xs text-gray-300">
                        {isAdmin ? 'Admin' : 'Tornar Admin'}
                      </span>
                    </Button>
                    <Button
                      onClick={() => deleteUser(user.id, user.email)}
                      variant="outline"
                      size="sm"
                      className="border-zinc-700 hover:bg-red-500/10 hover:border-red-500/50 h-9 w-9 p-0 rounded-lg transition-all duration-200 flex-shrink-0"
                      title="Excluir usuário"
                    >
                      <Trash2 className="w-4 h-4 text-gray-400" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="text-center text-gray-500 py-16 bg-zinc-900/20 border border-zinc-800/50 rounded-lg">
            <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="mb-1">{searchQuery ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}</p>
            <p className="text-sm text-gray-600">
              {searchQuery ? 'Tente buscar com outros termos' : 'Adicione seu primeiro usuário usando o botão acima'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}