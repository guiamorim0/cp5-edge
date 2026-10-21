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
