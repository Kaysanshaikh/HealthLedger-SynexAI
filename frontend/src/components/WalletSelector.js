import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, Wallet, ChevronDown, X } from 'lucide-react';

const WalletSelectorModal = ({ isOpen, onClose }) => {
  const { providers, selectedProvider, selectProvider } = useAuth();
  const modalRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (provider) => {
    selectProvider(provider);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
        animation: 'walletFadeIn 0.18s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{`
        @keyframes walletFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes walletSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        .wallet-card-btn {
          display: flex; align-items: center; gap: 1rem;
          width: 100%; padding: 1rem 1.25rem;
          border-radius: 14px; border: 1.5px solid transparent;
          background: var(--wallet-card-bg, #1a1a2e);
          cursor: pointer; transition: all 0.2s ease;
          text-align: left; position: relative; overflow: hidden;
        }
        .wallet-card-btn:hover {
          border-color: #6c63ff88;
          background: #6c63ff15;
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(108,99,255,0.18);
        }
        .wallet-card-btn.selected {
          border-color: #6c63ff;
          background: #6c63ff1a;
          box-shadow: 0 0 0 3px #6c63ff22;
        }
        .wallet-card-btn .wallet-shimmer {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.04) 50%, transparent 60%);
          transition: opacity 0.3s;
        }
      `}</style>

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Select Wallet Provider"
        style={{
          background: 'var(--wallet-modal-bg, #12121f)',
          borderRadius: '20px',
          padding: '1.75rem',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.07)',
          animation: 'walletSlideUp 0.22s ease',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#f0f0f5', letterSpacing: '-0.01em' }}>
              Connect Wallet
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#9090b0' }}>
              Choose your preferred wallet extension
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%',
              width: 32, height: 32, cursor: 'pointer', color: '#9090b0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.13)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
            aria-label="Close wallet selector"
          >
            <X size={15} />
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: '1rem' }} />

        {/* Wallet List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {providers.map((provider) => {
            const isSelected = selectedProvider?.info.uuid === provider.info.uuid;
            return (
              <button
                key={provider.info.uuid}
                onClick={() => handleSelect(provider)}
                className={`wallet-card-btn ${isSelected ? 'selected' : ''}`}
              >
                <div className="wallet-shimmer" />
                {/* Wallet Icon */}
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.1)',
                  overflow: 'hidden',
                }}>
                  <img
                    src={provider.info.icon}
                    alt={provider.info.name}
                    style={{ width: 28, height: 28, objectFit: 'contain' }}
                  />
                </div>

                {/* Wallet Name & RDNS */}
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: '600', fontSize: '0.95rem', color: '#e8e8f5' }}>
                    {provider.info.name}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#6060a0', marginTop: 1 }}>
                    {provider.info.rdns || 'Browser Extension'}
                  </p>
                </div>

                {/* Selected Check */}
                {isSelected ? (
                  <CheckCircle2 size={20} color="#6c63ff" strokeWidth={2.5} />
                ) : (
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.15)',
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer note */}
        <p style={{
          margin: '1.1rem 0 0', textAlign: 'center', fontSize: '0.7rem',
          color: '#4a4a6a', lineHeight: 1.5,
        }}>
          Only browser-installed wallets are shown.
        </p>
      </div>
    </div>
  );
};

// ─── Trigger Button rendered inline in the form ────────────────────────────────
const WalletSelector = () => {
  const { providers, selectedProvider, isUsingBurnerWallet } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Don't show if using burner wallet or only one provider
  if (isUsingBurnerWallet || providers.length <= 1) return null;

  const current = selectedProvider;

  return (
    <>
      <div style={{ marginBottom: '0.5rem' }}>
        <label style={{
          display: 'block', fontSize: '0.72rem', fontWeight: '700',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: '#9090b0', marginBottom: '0.5rem',
        }}>
          Wallet Provider
        </label>

        <button
          id="wallet-selector-trigger"
          onClick={() => setIsOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            width: '100%', padding: '0.65rem 0.9rem',
            borderRadius: '12px',
            border: '1.5px solid rgba(108,99,255,0.45)',
            background: 'rgba(108,99,255,0.08)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 0 0 0px #6c63ff',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#6c63ff';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(108,99,255,0.15)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(108,99,255,0.45)';
            e.currentTarget.style.boxShadow = '0 0 0 0px #6c63ff';
          }}
        >
          {/* Icon */}
          {current ? (
            <img
              src={current.info.icon}
              alt={current.info.name}
              style={{ width: 22, height: 22, borderRadius: 6 }}
            />
          ) : (
            <Wallet size={18} color="#6c63ff" />
          )}

          {/* Name */}
          <span style={{ flex: 1, textAlign: 'left', fontWeight: '600', fontSize: '0.88rem', color: 'var(--foreground, #111)' }}>
            {current ? current.info.name : 'Select a wallet…'}
          </span>

          {/* Badge */}
          <span style={{
            fontSize: '0.65rem', fontWeight: '600', padding: '2px 8px',
            borderRadius: '20px', background: '#6c63ff22', color: '#9d96ff',
            border: '1px solid #6c63ff44',
          }}>
            {providers.length} found
          </span>
          <ChevronDown size={15} color="#6060a0" />
        </button>
      </div>

      <WalletSelectorModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default WalletSelector;
