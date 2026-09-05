/* ============================================================
   CONFIGURACIÓN  —  cambia todo desde aquí
   ============================================================ */
window.CONFIG = {

  /* --- 1. CONTRASEÑA -------------------------------------- */
  // Puedes poner varias respuestas válidas. No importan mayúsculas,
  // acentos ni espacios.
  passwords: ['litzy', 'mi reina hermosa', 'reina'],

  // La pista que aparece al tocar "¿Una pista?"
  hint: 'Es como te llamo cuando quiero verte sonreír 🤍',

  /* --- 2. MÚSICA ------------------------------------------ */
  // El link de Spotify (empieza a sonar al abrir el sobre).
  spotifyTrackId: '1eUDEJzgmfNcqXnFz0ObfD',

  // OPCIONAL pero recomendado: pon un mp3 en assets/audio/song.mp3
  // Si existe, suena la canción completa en bucle y automáticamente.
  // Si no existe, se usa el reproductor de Spotify.
  localAudio: 'assets/audio/song.mp3',

  /* --- 3. YOUTUBE ----------------------------------------- */
  // Sólo el ID del video: youtube.com/watch?v=AQUI_VA_EL_ID
  youtubeId: 'i810CxN5Q6Q',

  /* --- 4. VIDEOS TUYOS ------------------------------------ */
  // Deja los archivos en:  assets/video/her.mp4  y  assets/video/him.mp4
  // Si no están, la web muestra un marco elegante en su lugar.

  /* --- 5. AJUSTES ----------------------------------------- */
  introDuration: 1,        // 1 = normal, 0.7 = más rápido, 1.4 = más lento
  rememberUnlock: true,    // recordar que ya abrió el sobre
  skipIntroOnReturn: true  // no repetir el intro cada visita
};
