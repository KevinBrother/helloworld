module.exports = {
  extends: [require.resolve('@bixi-design/lint/eslint')],
  rules: {
    '@typescript-eslint/no-explicit-any': ['warn'],
    indent: ['off']
  }
};
