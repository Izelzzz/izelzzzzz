import nextConfig from 'eslint-config-next/core-web-vitals'

const config = [
  {
    ignores: ['.codex/**', '.next/**', '.next-dev/**', '.open-next/**', 'node_modules/**'],
  },
  ...nextConfig,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]

export default config
