import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  { ignores: [".next/**", "node_modules/**", "out/**", "next-env.d.ts"] },
  {
    // Giveaway outcomes must be reproducible from published inputs.
    files: ["lib/giveaways/**"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "Math",
          property: "random",
          message: "Giveaway code must use crypto randomness, never Math.random.",
        },
      ],
    },
  },
];

export default eslintConfig;
