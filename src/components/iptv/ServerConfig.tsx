'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useServersStore } from '@/store/servers';
import { useNotifications } from '@/hooks/useNotifications';
import { useLogsStore } from '@/store/logs';

export const ServerConfig: React.FC = () => {
  const [formData, setFormData] = useState({ name: '', url: '', username: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addServer = useServersStore(s => s.addServer);
  const setLoading = useServersStore(s => s.setLoading);
  const { success, error } = useNotifications();
  const addLog = useLogsStore(s => s.addLog);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'El nombre del servidor es requerido';
    else if (formData.name.length < 3) newErrors.name = 'El nombre debe tener al menos 3 caracteres';
    if (!formData.url.trim()) newErrors.url = 'La URL del servidor es requerida';
    else if (!formData.url.match(/^https?:\/\/.+/i)) newErrors.url = 'La URL debe comenzar con http:// o https://';
    if (!formData.username.trim()) newErrors.username = 'El usuario es requerido';
    if (!formData.password.trim()) newErrors.password = 'La contraseña es requerida';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      error('Formulario inválido', 'Por favor, corrige los errores antes de continuar');
      return;
    }
    setIsSubmitting(true);
    setLoading(true);
    try {
      addLog(`Agregando servidor: ${formData.name}`, 'info');
      const newServer = await addServer(formData);
      setFormData({ name: '', url: '', username: '', password: '' });
      setErrors({});
      success('Servidor agregado', `${newServer.name} se agregó exitosamente`);
      addLog(`✅ Servidor ${newServer.name} agregado exitosamente`, 'success');
    } catch (err: any) {
      const errorMessage = err.message || 'Error al agregar servidor';
      error('Error', errorMessage);
      addLog(`❌ Error agregando servidor: ${errorMessage}`, 'error');
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  return (
    <Card variant="elevated" className="mb-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🔧</span>
        <h2 className="text-xl font-semibold text-white">Configuración de Servidor</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Nombre del Servidor" placeholder="Servidor Principal" value={formData.name} onChange={handleInputChange('name')} error={errors.name} icon={<span>🏷️</span>} disabled={isSubmitting} />
          <Input label="URL del Servidor" placeholder="http://ejemplo.com:8080" value={formData.url} onChange={handleInputChange('url')} error={errors.url} icon={<span>🌐</span>} disabled={isSubmitting} helperText="Debe incluir protocolo (http:// o https://)" />
          <Input label="Usuario" placeholder="usuario123" value={formData.username} onChange={handleInputChange('username')} error={errors.username} icon={<span>👤</span>} disabled={isSubmitting} autoComplete="username" />
          <Input label="Contraseña" type="password" placeholder="••••••••••" value={formData.password} onChange={handleInputChange('password')} error={errors.password} icon={<span>🔐</span>} disabled={isSubmitting} autoComplete="current-password" />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="primary" loading={isSubmitting} icon="➕" disabled={isSubmitting}>{isSubmitting ? 'Agregando...' : 'Agregar Servidor'}</Button>
          <Button type="button" variant="outline" onClick={() => { setFormData({ name: '', url: '', username: '', password: '' }); setErrors({}); }} icon="🧹" disabled={isSubmitting}>Limpiar</Button>
        </div>
      </form>
    </Card>
  );
};