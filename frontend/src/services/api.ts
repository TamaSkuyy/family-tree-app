export const checkHealth = async () => {
    const response = await fetch('/health');
    return response.text();
  };