// frontend/src/hooks/usePWAInstall.js
// FASE 2: hook que captura o evento nativo "beforeinstallprompt" do navegador
// Funciona em Android/Chrome. iOS mostra instruções manuais (limitação da Apple).

import { useState, useEffect } from "react";

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled,   setIsInstalled]   = useState(false);
  const [isIOS,         setIsIOS]         = useState(false);

  useEffect(() => {
    // Detecta iOS (Safari não dispara beforeinstallprompt)
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    // Verifica se já está instalado como PWA (modo standalone)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    setIsInstalled(standalone);

    // Android/Chrome: captura o evento para acionar mais tarde
    const handler = (e) => {
      e.preventDefault(); // impede o mini-infobar automático do Chrome
      setInstallPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Após instalar, marca como instalado
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Aciona o prompt nativo de instalação (Android/Chrome)
  const triggerInstall = async () => {
    if (!installPrompt) return false;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setInstallPrompt(null);
    return outcome === "accepted";
  };

  return {
    canInstall:     !!installPrompt && !isInstalled, // Android: mostra botão
    isIOS,                                           // iOS: mostra instrução manual
    isInstalled,                                     // já instalado: esconde banner
    triggerInstall,
  };
}
