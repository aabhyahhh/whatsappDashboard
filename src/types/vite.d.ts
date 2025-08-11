declare module 'vite' {
  interface UserConfig {
    plugins?: any[];
    resolve?: {
      alias?: Record<string, string>;
    };
  }

  function defineConfig(config: UserConfig): any;
  export { defineConfig };
}

declare module '@vitejs/plugin-react' {
  const react: () => any;
  export default react;
} 