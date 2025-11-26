import React from "react";
import { POPULAR_ROUTES } from "../data/popularRoutes";

type Props = {
  city: string;
  onSelectRoute: (routeId: string) => void;
  onBack: () => void;
};

export const PopularRoutesPage: React.FC<Props> = ({ city, onSelectRoute, onBack }) => {
  const routes = POPULAR_ROUTES[city] || [];

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={{ marginBottom: 16 }}>← Назад</button>

      <h2>Маршруты: {city}</h2>

      {routes.map(route => (
        <div
          key={route.id}
          onClick={() => onSelectRoute(route.id)}
          style={{
            padding: 16,
            borderRadius: 16,
            background: "#fff",
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
            marginBottom: 16,
            cursor: "pointer"
          }}
        >
          <h3 style={{ marginBottom: 8 }}>{route.title}</h3>
          <p style={{ fontSize: 13, opacity: 0.7 }}>{route.description}</p>
        </div>
      ))}
    </div>
  );
};
