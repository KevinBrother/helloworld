module.exports = {
  env: {
    browser: true,
    node: true,
    es2021: true
  },
  extends: ['plugin:react/recommended', 'airbnb'],
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['react'],
  rules: {
    'comma-dangle': ['error', 'never'],
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    'react/jsx-filename-extension': ['warn', { extensions: ['.js', '.jsx'] }],
    'react/jsx-one-expression-per-line': 'off',
    'react/button-has-type': 'off',
    'no-console': 'off'
  }
};
