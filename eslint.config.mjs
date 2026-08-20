import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: ["data/**", ".next/**", "node_modules/**"],
  },
];

export default eslintConfig;
