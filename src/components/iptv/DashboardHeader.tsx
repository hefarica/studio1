'use client';

import React from 'react';

export const DashboardHeader: React.FC = () => {
  const title = "Constructor IPTV Pro Multi-Servidor - Sistema Inteligente";
  const subtitle = "Base de datos incremental con cache inteligente";

  return (
    <div className="relative overflow-hidden bg-slate-900">
      <div className="absolute inset-0 bg-gradient-to-r from-primary-600 via-primary-500 to-secondary opacity-90" />
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full animate-pulse" />
        <div className="absolute top-1/2 -left-8 w-16 h-16 bg-white/5 rounded-full animate-bounce" />
        <div className="absolute bottom-4 right-1/3 w-8 h-8 bg-white/15 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      
      <div className="relative z-10 text-center py-12 px-6">
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="text-6xl animate-bounce-subtle">📺</div>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Studio1
          </h1>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl md:text-2xl font-semibold text-white/95 mb-3">
            {title}
          </h2>
          <p className="text-lg text-white/80 leading-relaxed">
            {subtitle}
          </p>
        </div>
        
        <div className="flex justify-center mt-8">
          <div className="inline-flex items-center gap-6 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20">
            <div className="flex items-center gap-2 text-white/90">
              <span className="text-emerald-300">✨</span>
              <span className="text-sm font-medium">Hasta 40K+ canales</span>
            </div>
            <div className="w-px h-4 bg-white/30" />
            <div className="flex items-center gap-2 text-white/90">
              <span className="text-blue-300">⚡</span>
              <span className="text-sm font-medium">Escaneo en 3-5 min</span>
            </div>
            <div className="w-px h-4 bg-white/30" />
            <div className="flex items-center gap-2 text-white/90">
              <span className="text-purple-300">🤖</span>
              <span className="text-sm font-medium">IA Integrada</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0">
        <svg className="w-full h-6 text-dark-bg" fill="currentColor" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" />
        </svg>
      </div>
    </div>
  );
};