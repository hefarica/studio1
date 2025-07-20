'use client';

import React, { useState } from 'react';

const ServerConfiguration = ({ onAddServer, onTestConnections, scanning }) => {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    username: '',
    password: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.url || !formData.username || !formData.password) {
      alert('Por favor, complete todos los campos');
      return;
    }

    if (!isValidURL(formData.url)) {
      alert('URL del servidor no válida');
      return;
    }

    const result = await onAddServer(formData);
    
    if (result.success) {
      setFormData({
        name: '',
        url: '',
        username: '',
        password: ''
      });
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const isValidURL = (string) => {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="server-config">
      <h2>
        <span className="icon">🔧</span>
        Configuración de Servidor
      </h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="serverName">Nombre del Servidor</label>
            <input
              type="text"
              id="serverName"
              name="name"
              placeholder="Servidor Principal"
              value={formData.name}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={scanning}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="serverURL">URL del Servidor</label>
            <input
              type="text"
              id="serverURL"
              name="url"
              placeholder="http://..."
              value={formData.url}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={scanning}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="username">Usuario</label>
            <input
              type="text"
              id="username"
              name="username"
              placeholder="Usuario"
              value={formData.username}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={scanning}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="••••••••••"
              value={formData.password}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={scanning}
            />
          </div>
        </div>
        
        <div className="form-buttons">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={scanning}
          >
            <span>➕</span> Agregar Servidor
          </button>
          
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={onTestConnections}
            disabled={scanning}
          >
            <span>🔗</span> Probar Conexiones
          </button>
        </div>
      </form>
    </div>
  );
};

export default ServerConfiguration;
