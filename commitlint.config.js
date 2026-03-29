module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        "core",
        "audit",
        "iam",
        "compliance",
        "storage",
        "db",
        "ui",
        "api",
        "web",
        "docs",
        "ci",
        "deps",
      ],
    ],
  },
};
