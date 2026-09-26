import { PropsWithChildren, createContext, useContext, useMemo, useState } from 'react';

type GameState = {
  puppyPoints: number;
  clickPower: number;
  addPuppyPoints: () => void;
};

const GameContext = createContext<GameState | null>(null);

export function GameProvider({ children }: PropsWithChildren) {
  const [puppyPoints, setPuppyPoints] = useState(0);
  const [clickPower] = useState(1);

  const value = useMemo<GameState>(
    () => ({
      puppyPoints,
      clickPower,
      addPuppyPoints: () => setPuppyPoints((current) => current + clickPower),
    }),
    [clickPower, puppyPoints],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const value = useContext(GameContext);
  if (!value) {
    throw new Error('useGame must be used inside GameProvider');
  }
  return value;
}
