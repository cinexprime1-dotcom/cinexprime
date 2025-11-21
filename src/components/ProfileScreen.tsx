import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { User, Lock, Shield, LogOut, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ProfileScreenProps {
  onNavigateToAdmin: () => void;
}

export function ProfileScreen({ onNavigateToAdmin }: ProfileScreenProps) {
  const { user, signOut, updatePassword, isAdmin } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(newPassword);
      setMessage('Senha alterada com sucesso');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1117] pb-24 w-full">
      <div className="p-6 space-y-6 w-full max-w-2xl mx-auto">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-white text-3xl tracking-tight">Perfil</h1>
          <p className="text-gray-400">Gerencie suas informações e configurações</p>
        </div>
        
        {/* User Info Card */}
        <div className="bg-[#141419] border border-zinc-800/50 rounded-2xl p-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/20">
              <User className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-white text-xl mb-1.5 truncate">Minha Conta</h2>
              <div className="flex items-center gap-2 text-gray-400">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm truncate">{user?.email}</span>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="mt-6 pt-6 border-t border-zinc-800/50">
              <Button
                onClick={onNavigateToAdmin}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-600/30 flex items-center justify-center gap-2"
              >
                <Shield className="w-5 h-5" />
                <span>Painel Administrativo</span>
              </Button>
            </div>
          )}
        </div>

        {/* Change Password Card */}
        <div className="bg-[#141419] border border-zinc-800/50 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-zinc-900/50 flex items-center justify-center">
              <Lock className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-white text-lg">Alterar Senha</h3>
              <p className="text-gray-500 text-sm">Atualize sua senha de acesso</p>
            </div>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm text-gray-400 ml-1">Nova senha</label>
              <Input
                type="password"
                placeholder="Digite sua nova senha"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="h-12 bg-zinc-900/50 border-zinc-800/50 text-white placeholder:text-gray-600 rounded-xl focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm text-gray-400 ml-1">Confirmar nova senha</label>
              <Input
                type="password"
                placeholder="Digite novamente a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-12 bg-zinc-900/50 border-zinc-800/50 text-white placeholder:text-gray-600 rounded-xl focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
              />
            </div>

            {message && (
              <div className="flex items-start gap-3 bg-green-950/30 border border-green-900/30 rounded-xl p-4">
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-green-400 text-sm leading-relaxed">{message}</p>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-3 bg-red-950/30 border border-red-900/30 rounded-xl p-4">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm leading-relaxed">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Alterando...</span>
                </div>
              ) : (
                'Alterar Senha'
              )}
            </Button>
          </form>
        </div>

        {/* Sign Out Button */}
        <Button
          onClick={signOut}
          variant="outline"
          className="w-full h-12 bg-zinc-900/30 border-zinc-800/50 text-gray-300 hover:bg-zinc-900/50 hover:text-white hover:border-zinc-700 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair da Conta</span>
        </Button>
      </div>
    </div>
  );
}