// src/config/uxProfiles.js
// One layout profile per device class. UXMode applies the active profile as CSS variables on <body>
// (plus body[data-ux] for structural rules), so every screen reads the same sizes.
//
//   desktop    one top row: [sound][lang][pause] [HUD plaques ...] [My Page][Logout]
//   landscape  same single row, compact sizes for ~390px-tall phones
//   portrait   two top rows: row 1 = [sound][lang][pause] ... [My Page][Logout], row 2 = HUD / screen header

export const UX_PROFILES = {
  desktop: {
    fov: 55,
    topRows: 1,
    vars: {
      '--chip-size': '34px',
      '--corner-size': '46px',
      '--topbar-h': '62px',
      '--account-h': '40px',
      '--account-font': '14px',
      '--hud-top': '10px',
      '--hud-plaque-h': '54px',
      '--hud-value': '24px',
      '--hud-label': '11px',
      '--hud-icon': '32px',
      '--hud-track': '86px',
      '--arc-scale': '2',
      '--arc-x': '32%',
      '--arrow-x': '68%',
      '--arrow-h': '54px',
      '--arrow-w': '60px'
    }
  },

  landscape: {
    fov: 60,
    topRows: 1,
    vars: {
      '--chip-size': '34px',
      '--corner-size': '40px',
      '--topbar-h': '54px',
      '--account-h': '34px',
      '--account-font': '13px',
      '--hud-top': '8px',
      '--hud-plaque-h': '44px',
      '--hud-value': '20px',
      '--hud-label': '10px',
      '--hud-icon': '28px',
      '--hud-track': '74px',
      '--arc-scale': '1.5',
      '--arc-x': '32%',
      '--arrow-x': '68%',
      '--arrow-h': '46px',
      '--arrow-w': '52px'
    }
  },

  portrait: {
    fov: 75,
    topRows: 2,
    vars: {
      '--chip-size': '36px',
      '--corner-size': '40px',
      '--topbar-h': '58px',
      '--account-h': '36px',
      '--account-font': '13px',
      '--hud-top': '58px',
      '--hud-plaque-h': '48px',
      '--hud-value': '20px',
      '--hud-label': '10px',
      '--hud-icon': '28px',
      '--hud-track': '100%',
      '--arc-scale': '1.5',
      '--arc-x': '28%',
      '--arrow-x': '72%',
      '--arrow-h': '42px',
      '--arrow-w': '44px'
    }
  }
};
