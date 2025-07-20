'use client';

import React from 'react';

const ProgressContainer = ({ progress }) => {
  if (!progress.visible) {
    return null;
  }

  return (
    <div className="progress-container active">
      <div className="progress-header">
        <div className="progress-title">{progress.title}</div>
        <div className="progress-stats">
          {progress.current} / {progress.total} ({progress.percentage.toFixed(1)}%)
        </div>
      </div>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${Math.min(100, Math.max(0, progress.percentage))}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressContainer;
