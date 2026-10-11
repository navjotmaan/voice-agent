export const LoadingOrb = ({ size = 30 }) => {
  return (
    <div
      className={`animate-spin rounded-full border-4 border-violet-900/40 border-t-violet-400 m-10`}
      style={{
        width: size,
        height: size,
        boxShadow: "0 0 12px 2px rgba(168,85,247,0.5)",
      }}
    />
  );
};

export default LoadingOrb;