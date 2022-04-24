import React, { useEffect, useState, useCallback } from 'react';
import { useSummary } from '../hooks/useSummary';

export default function Bug() {
  const [isSystemSummary, setIsSystemSummary] = useState('custom');
  const { summary } = useSummary(isSystemSummary);
  return (
    <div>
      {isSystemSummary}/ flowNum : {summary.flowNum}
      <div onClick={() => setIsSystemSummary('custom')}>custom</div>
      <div onClick={() => setIsSystemSummary('system')}>system</div>
    </div>
  );
}
