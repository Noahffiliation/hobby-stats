import coreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...coreWebVitals,
  {
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "coverage/**", "out/**"],
  },
];

export default eslintConfig;
