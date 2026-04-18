import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from './ui/card';
import { CheckCircle2 } from 'lucide-react';

const WalletSelector = () => {
  const { providers, selectedProvider, selectProvider, isUsingBurnerWallet } = useAuth();

  // Don't show if using burner wallet or only 1 provider is found
  if (isUsingBurnerWallet || providers.length <= 1) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">
        Select Wallet Provider
      </p>
      <div className="grid grid-cols-1 gap-2">
        {providers.map((provider) => (
          <button
            key={provider.info.uuid}
            onClick={() => selectProvider(provider)}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${
              selectedProvider?.info.uuid === provider.info.uuid
                ? 'bg-primary/10 border-primary ring-1 ring-primary'
                : 'bg-background hover:bg-muted border-border hover:border-primary/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <img 
                src={provider.info.icon} 
                alt={provider.info.name} 
                className="w-6 h-6 rounded-md shadow-sm"
              />
              <span className="font-semibold text-sm">{provider.info.name}</span>
            </div>
            {selectedProvider?.info.uuid === provider.info.uuid && (
              <CheckCircle2 className="w-4 h-4 text-primary animate-in zoom-in" />
            )}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground/70 px-1 italic">
        Multiple wallets detected. Please choose which extension to use.
      </p>
    </div>
  );
};

export default WalletSelector;
