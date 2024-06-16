module.exports = {
    parser: '@typescript-eslint/parser',
    env: {
        "browser": true,
        "es2021": true,
    },
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
    ],
    rules: {
        "@typescript-eslint/switch-exhaustiveness-check": "error",
        "no-inner-declarations": "off",
        "@typescript-eslint/no-namespace": "off"
    },
    parserOptions: {
        "ecmaVersion": "latest",
        "sourceType": "module",
        project: "./tsconfig.json"
    },
}
