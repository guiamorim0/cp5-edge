/**
 * Icones em SVG inline, em vez de emoji.
 *
 * Emoji muda de desenho conforme o sistema (Windows, Android e iOS tem
 * versoes diferentes) e nao da para controlar cor nem espessura. Como SVG,
 * o icone herda a cor do texto via currentColor e fica igual em qualquer
 * aparelho, inclusive no celular durante a apresentacao.
 */

const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export function IconeTemperatura(props) {
  return (
    <svg {...base} {...props}>
      <path d="M14 14.76V4a2 2 0 1 0-4 0v10.76a4.5 4.5 0 1 0 4 0Z" />
      <path d="M12 9v6" />
    </svg>
  )
}

export function IconeUmidade(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 2.8 6.9 8.2a7.2 7.2 0 1 0 10.2 0L12 2.8Z" />
      <path d="M9 14.5a3 3 0 0 0 3 3" />
    </svg>
  )
}

export function IconeLuminosidade(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  )
}

/** Marca do app: uma taca, desenhada com o mesmo traco dos demais icones. */
export function IconeMarca(props) {
  return (
    <svg {...base} width={22} height={22} {...props}>
      <path d="M7 3h10l-.7 5.2a4.4 4.4 0 0 1-8.6 0L7 3Z" />
      <path d="M12 13v6M8.5 19h7" />
    </svg>
  )
}

/* ---------- Icones do menu lateral ----------
   Mesma grade e traco dos de cima, para o menu parecer um conjunto so. */

export function IconePainel(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="4.5" rx="1.5" />
      <rect x="13.5" y="10.5" width="7.5" height="10.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </svg>
  )
}

export function IconeLimites(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="9" cy="7" r="2.2" />
      <circle cx="15" cy="12" r="2.2" />
      <circle cx="8" cy="17" r="2.2" />
    </svg>
  )
}

export function IconeVinhos(props) {
  return (
    <svg {...base} {...props}>
      <path d="M8 3h8l-.6 4.4a3.5 3.5 0 0 1-6.8 0L8 3Z" />
      <path d="M12 11.5V19M9 19h6" />
    </svg>
  )
}

export function IconeEventos(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 8.5v4.5M12 16.2v.3" />
      <path d="M10.3 3.9 2.6 17.2A1.9 1.9 0 0 0 4.3 20h15.4a1.9 1.9 0 0 0 1.7-2.8L13.7 3.9a1.9 1.9 0 0 0-3.4 0Z" />
    </svg>
  )
}

export function IconeRelatorios(props) {
  return (
    <svg {...base} {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  )
}

export function IconeSimulacao(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9.5 3h5M12 3v4.2L6.6 17.4A2.4 2.4 0 0 0 8.7 21h6.6a2.4 2.4 0 0 0 2.1-3.6L12 7.2" />
      <path d="M8.4 14h7.2" />
    </svg>
  )
}

export function IconeAmbientes(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4" width="18" height="6" rx="2" />
      <rect x="3" y="14" width="18" height="6" rx="2" />
      <path d="M7 7h.01M7 17h.01" />
    </svg>
  )
}
