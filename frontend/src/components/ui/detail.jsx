import React from "react";

const OpeningDetail = ({ opening, onClose }) => {
  if (!opening) {
    return null; // Prevent rendering if opening is undefined
  }

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full overflow-y-auto max-h-full p-6 relative">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl"
        aria-label="Close"
      >
        &times;
      </button>

      {/* Opening Name and ECO Code */}
      <h2 className="text-2xl font-bold mb-2">{opening.openingName}</h2>
      <p className="text-gray-600 mb-4">ECO Code: {opening.ecoCode}</p>

      {/* Opening Description */}
      <div className="mb-4">
        <h3 className="text-xl font-semibold">Description</h3>
        <p className="text-gray-800">{opening.description}</p>
      </div>

      {/* Strategic Ideas */}
      <div className="mb-4">
        <h3 className="text-xl font-semibold">Strategic Ideas</h3>
        <p className="text-gray-800">{opening.strategicIdeas}</p>
      </div>

      {/* Famous Games */}
      <div className="mb-4">
        <h3 className="text-xl font-semibold">Famous Games</h3>
        <ul className="list-disc list-inside text-gray-800">
          {opening.famousGames && opening.famousGames.length > 0 ? (
            opening.famousGames.map((game, index) => (
              <li key={index}>
                <strong>{game.game}</strong> ({game.year}, {game.event}) -{" "}
                {game.moves.join(", ")}
              </li>
            ))
          ) : (
            <li>No famous games listed.</li>
          )}
        </ul>
      </div>

      {/* Variations */}
      <div className="mb-4">
        <h3 className="text-xl font-semibold">Variations</h3>
        {opening.variations && opening.variations.length > 0 ? (
          opening.variations.map((variation, index) => (
            <div key={`${variation.variationName}-${index}`} className="mt-2">
              <h4 className="font-semibold">{variation.variationName}</h4>
              <p className="text-gray-800">{variation.description}</p>
              <p className="text-gray-800">
                <strong>Strategic Ideas:</strong> {variation.strategicIdeas}
              </p>
              <p className="text-gray-800">
                <strong>Famous Games:</strong>
              </p>
              <ul className="list-disc list-inside text-gray-800 ml-4">
                {variation.famousGames && variation.famousGames.length > 0 ? (
                  variation.famousGames.map((game, idx) => (
                    <li key={idx}>
                      <strong>{game.game}</strong> ({game.year}, {game.event}) -{" "}
                      {game.moves.join(", ")}
                    </li>
                  ))
                ) : (
                  <li>No famous games listed.</li>
                )}
              </ul>
            </div>
          ))
        ) : (
          <p className="text-gray-800">No variations listed.</p>
        )}
      </div>
    </div>
  );
};

export default OpeningDetail;
