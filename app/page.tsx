'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const joinGame = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/match/join', { method: 'POST' });
      const { matchId, playerId } = await res.json();
      router.push(`/match/${matchId}?playerId=${playerId}`);
    } catch (error) {
      console.error('Failed to join game:', error);
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
      <h1>Pong Multiplayer</h1>
      <button 
        onClick={joinGame} 
        disabled={loading}
        style={{ padding: '10px 20px', fontSize: '18px', cursor: 'pointer' }}
      >
        {loading ? 'Joining...' : 'Join Game'}
      </button>
    </div>
  );
}
