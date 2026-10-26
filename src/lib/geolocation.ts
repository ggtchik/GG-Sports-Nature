export interface PositionFix {
  lat: number;
  lon: number;
  accuracy: number;
}

export function getCurrentPosition(): Promise<PositionFix> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('La géolocalisation n’est pas disponible sur cet appareil.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        const messages: Record<number, string> = {
          1: 'Localisation refusée. Vous pouvez saisir votre position manuellement.',
          2: 'Position indisponible. Vérifiez le GPS ou le réseau.',
          3: 'La localisation a expiré. Réessayez.',
        };
        reject(new Error(messages[error.code] ?? 'Localisation impossible.'));
      },
      { enableHighAccuracy: true, timeout: 14_000, maximumAge: 60_000 },
    );
  });
}
