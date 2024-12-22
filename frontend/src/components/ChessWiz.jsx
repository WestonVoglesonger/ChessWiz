import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  BookOpen,
  ChevronRight,
  RefreshCw,
  Zap,
  ArrowLeft,
  ArrowRight,
  Maximize,
  Minimize
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Chess } from "chess.js";
import "chessboard-element";

const ChessWiz = () => {
  // ------------------------------------------
  // Chess + Variation states
  // ------------------------------------------
  const [game] = useState(new Chess());

  // If using environment variable, remove trailing slashes
  const API_BASE_URL = (import.meta.env.VITE_API_URL || "https://chesswiz.onrender.com")
    .replace(/\/+$/, "");

  // Variation practice
  const [currentOpeningId, setCurrentOpeningId] = useState(null);
  const [currentVariationName, setCurrentVariationName] = useState(null);
  const [currentMoves, setCurrentMoves] = useState([]); // array of SAN moves
  const [currentIndex, setCurrentIndex] = useState(0);

  // Board/feedback states
  const [feedback, setFeedback] = useState("");
  const [wrongMove, setWrongMove] = useState(false);
  const [boardPosition, setBoardPosition] = useState("start");

  // Track last correct move position/index
  const [lastFen, setLastFen] = useState("start");
  const [lastFenIndex, setLastFenIndex] = useState(0);

  // Opening data from the API
  const [openings, setOpenings] = useState([]);
  const [selectedOpening, setSelectedOpening] = useState(null);

  // Misc UI
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Refs to handle piece drops in an asynchronous manner
  const currentMovesRef = useRef(currentMoves);
  const currentIndexRef = useRef(currentIndex);

  // Keep refs up to date
  useEffect(() => {
    currentMovesRef.current = currentMoves;
  }, [currentMoves]);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // ------------------------------------------
  // Utility function for building endpoint URL
  // ------------------------------------------
  const buildUrl = (path) => `${API_BASE_URL}/${path.replace(/^\/+/, "")}`;

  // ------------------------------------------
  // Drop event logic
  // ------------------------------------------
  const handlePieceDrop = useCallback((event) => {
    const { source, target, setAction } = event.detail;

    // If no moves => freeplay
    if (currentMovesRef.current.length === 0) {
      const attempt = game.move({ from: source, to: target, promotion: "q" });
      if (!attempt) {
        setAction("snapback");
        setFeedback("Illegal move (freeplay).");
      } else {
        setBoardPosition(game.fen());
        setFeedback("Freeplay move recorded.");
      }
      return;
    }

    // If all moves in the variation are already done
    if (currentIndexRef.current >= currentMovesRef.current.length) {
      setAction("snapback");
      setFeedback("No more moves in this variation.");
      return;
    }

    // Attempt the move in chess.js
    const beforeFen = game.fen();
    const moveResult = game.move({ from: source, to: target, promotion: "q" });
    if (!moveResult) {
      setAction("snapback");
      setFeedback("Illegal move!");
      return;
    }

    // Compare the SAN with the correct move
    const userMove = moveResult.san.toLowerCase();
    const correctNext = currentMovesRef.current[currentIndexRef.current]?.toLowerCase();

    if (userMove === correctNext) {
      // Correct move
      setFeedback(`Good job! Move: ${userMove}`);
      setWrongMove(false);

      const newFen = game.fen();
      setBoardPosition(newFen);

      // Update lastFen + lastFenIndex to reflect new correct position
      setLastFen(newFen);
      setLastFenIndex(currentIndexRef.current + 1);

      // Move forward
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Wrong move => revert
      game.load(beforeFen); // revert the chess.js state
      setBoardPosition(beforeFen);
      setAction("snapback");
      event.stopPropagation();

      setFeedback("Wrong move!");
      setWrongMove(true);
    }
  }, [game]);

  // ------------------------------------------
  // Sidebar: load openings
  // ------------------------------------------
  const loadOpenings = async () => {
    setLoading(true);
    try {
      const resp = await fetch(buildUrl("api/openings"));
      if (!resp.ok) {
        setFeedback("Error loading openings.");
        return;
      }
      const data = await resp.json();
      setOpenings(data);
      setFeedback("Openings loaded.");
    } catch (error) {
      console.error("Error fetching openings:", error);
      setFeedback("Error fetching openings data.");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------
  // Select an opening => fetch full details
  // ------------------------------------------
  const handleSelectOpening = async (openingId) => {
    setFeedback("Loading opening details...");
    try {
      const resp = await fetch(buildUrl(`api/openings/${openingId}`));
      if (!resp.ok) {
        setFeedback("Error loading the full opening details.");
        return;
      }
      const data = await resp.json();
      // This data should have => {id, openingName, ecoCode, description, strategicIdeas, variations, famousGames...}
      setSelectedOpening(data);
      setFeedback("");
    } catch (err) {
      console.error("Error fetching opening details:", err);
      setFeedback("Error fetching the full opening details.");
    }
  };

  // ------------------------------------------
  // Start Variation Practice
  // ------------------------------------------
  const startVariationPractice = async (openingId, variationName) => {
    setFeedback(`Loading moves for ${variationName}...`);
    setCurrentOpeningId(openingId);
    setCurrentVariationName(variationName);
    setCurrentMoves([]);
    setCurrentIndex(0);
    setWrongMove(false);

    // Reset lastFen & lastFenIndex
    setLastFen("start");
    setLastFenIndex(0);

    // Reset the chessboard
    game.reset();
    setBoardPosition("start");

    try {
      const resp = await fetch(buildUrl(`api/openings/${openingId}/${variationName}`));
      if (!resp.ok) {
        setFeedback("Error loading variation moves.");
        return;
      }
      const movesData = await resp.json();
      if (!Array.isArray(movesData)) {
        setFeedback("Invalid variation data.");
        return;
      }
      setCurrentMoves(movesData);
      setFeedback("Variation loaded. Make the first move!");
    } catch (error) {
      console.error("Error fetching variation data:", error);
      setFeedback("Error fetching variation data.");
    }
  };

  // ------------------------------------------
  // Prev / Next Buttons
  // ------------------------------------------
  const handlePrevMove = () => {
    if (!currentMoves.length) {
      setFeedback("No moves to step back.");
      return;
    }
    if (currentIndex <= 0) {
      setFeedback("Already at the first move!");
      return;
    }
    game.undo();
    setBoardPosition(game.fen());
    setCurrentIndex((idx) => idx - 1);
    setFeedback("Stepped back one move.");
  };

  const handleNextMove = () => {
    if (!currentMoves.length) {
      setFeedback("No moves to step forward.");
      return;
    }
    if (currentIndex >= currentMoves.length) {
      setFeedback("Already at the last move.");
      return;
    }
    const nextMoveSAN = currentMoves[currentIndex];
    const result = game.move(nextMoveSAN);
    if (!result) {
      setFeedback("Invalid move sequence? Could not apply next move.");
      return;
    }
    setBoardPosition(game.fen());
    setCurrentIndex((idx) => idx + 1);
    setFeedback(`Forward move: ${nextMoveSAN}`);
  };

  // ------------------------------------------
  // Reset to last correct position
  // ------------------------------------------
  const handleResetToLastPosition = () => {
    if (lastFenIndex === 0) {
      // no correct moves yet => reset to start
      game.reset();
      setBoardPosition("start");
      setCurrentIndex(0);
      setWrongMove(false);
      setFeedback("No correct move to reset to. Board reset to start.");
      return;
    }
    // otherwise revert
    game.load(lastFen);
    setBoardPosition(lastFen);
    setCurrentIndex(lastFenIndex);
    setWrongMove(false);
    setFeedback("Reset to last correct move.");
  };

  // ------------------------------------------
  // Full board reset
  // ------------------------------------------
  const handleResetBoard = () => {
    if (currentMoves.length > 0) {
      // practicing
      game.reset();
      setBoardPosition("start");
      setLastFen("start");
      setLastFenIndex(0);
      setWrongMove(false);
      setCurrentIndex(0);
      setFeedback("Board reset for this variation. Move #1.");
    } else {
      // free-play
      game.reset();
      setBoardPosition("start");
      setFeedback("Board reset in free-play mode.");
    }
  };

  // ------------------------------------------
  // Freeplay mode
  // ------------------------------------------
  const enterFreeplayMode = () => {
    setFeedback("Switched to freeplay mode.");
    setCurrentOpeningId(null);
    setCurrentVariationName(null);
    setSelectedOpening(null);
    setCurrentMoves([]);
    setCurrentIndex(0);
    setWrongMove(false);

    game.reset();
    setBoardPosition("start");

    setLastFen("start");
    setLastFenIndex(0);
  };

  // ------------------------------------------
  // Random Variation
  // ------------------------------------------
  const handleRandomVariation = async () => {
    setFeedback("Loading random variation...");
    try {
      const resp = await fetch(buildUrl("api/practice/random"));
      if (!resp.ok) {
        setFeedback("No openings found or error.");
        return;
      }
      const data = await resp.json();
      setFeedback(`Random Variation: ${data.variationName}`);
      startVariationPractice(data.openingId, data.variationName);
    } catch (error) {
      console.error("Error fetching random variation:", error);
      setFeedback("Error fetching random variation.");
    }
  };

  // ------------------------------------------
  // Fullscreen
  // ------------------------------------------
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // ------------------------------------------
  // Add event listener for chessboard
  // ------------------------------------------
  useEffect(() => {
    const boardEl = document.querySelector("chess-board");
    if (boardEl) {
      boardEl.addEventListener("drop", handlePieceDrop);
    }
    return () => {
      if (boardEl) {
        boardEl.removeEventListener("drop", handlePieceDrop);
      }
    };
  }, [handlePieceDrop]);

  // ------------------------------------------
  // Render
  // ------------------------------------------
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      {/* Top Bar */}
      <div className="flex-none p-4 bg-white dark:bg-gray-800 shadow flex justify-between items-center transition-colors duration-300">
        <div className="flex items-center space-x-3">
          <BookOpen className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-transparent bg-clip-text">
            ChessWiz
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          {/* Freeplay Mode */}
          <button
            onClick={enterFreeplayMode}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors duration-300"
          >
            Freeplay Mode
          </button>
          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center space-x-1 transition-colors duration-300"
          >
            {isFullscreen ? (
              <>
                <Minimize className="w-4 h-4" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize className="w-4 h-4" />
                <span>Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar (only if not fullscreen) */}
        {!isFullscreen && (
          <div className="hidden md:block w-72 border-r border-gray-200 bg-gray-50 overflow-y-auto p-4">
            <div className="mb-6 flex space-x-2">
              <button
                onClick={loadOpenings}
                disabled={loading}
                className="flex-1 flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg shadow-md transition-colors duration-300"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                <span>{loading ? "Loading..." : "Openings"}</span>
              </button>
              <button
                onClick={handleRandomVariation}
                className="flex-1 flex items-center justify-center space-x-2 bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2 rounded-lg shadow-md transition-colors duration-300"
              >
                <Zap className="h-4 w-4" />
                <span>Random</span>
              </button>
            </div>

            {/* List of openings */}
            {openings.map((opening) => (
              <div
                key={opening.id}
                className="p-4 rounded-lg border border-gray-200 hover:border-indigo-600 hover:bg-indigo-50 transition-colors duration-300 mb-4"
              >
                <div
                  className="flex justify-between items-center cursor-pointer"
                  onClick={() => handleSelectOpening(opening.id)}
                >
                  <h3 className="font-medium text-gray-800 text-sm">
                    {opening.openingName} ({opening.ecoCode})
                  </h3>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
                <div className="mt-2 flex gap-2 flex-wrap">
                  {opening.variations.map((variation) => (
                    <button
                      key={variation}
                      onClick={() => startVariationPractice(opening.id, variation)}
                      className="px-2 py-1 rounded bg-indigo-500 hover:bg-indigo-600 text-xs text-white transition-colors duration-300"
                    >
                      {variation}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Main area */}
        <div className="flex-1 p-6 bg-white rounded-lg shadow-md overflow-auto">
          {/* If selectedOpening is set => show detail panel */}
          {selectedOpening ? (
            <div className="space-y-6">
              {/* Title + ECO + Close */}
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-indigo-600 mb-2 flex items-center">
                  {selectedOpening.openingName}
                  <span className="ml-2 px-2 py-1 text-sm text-white bg-indigo-500 rounded">
                    ECO: {selectedOpening.ecoCode}
                  </span>
                </h2>
                <button
                  onClick={() => setSelectedOpening(null)}
                  className="text-gray-500 hover:text-gray-700 transition-colors duration-300"
                >
                  ✕
                </button>
              </div>

              {/* Description */}
              {selectedOpening.description && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 flex items-center mb-2">
                    <BookOpen className="mr-2 w-5 h-5 text-indigo-500" />
                    Description
                  </h3>
                  <p className="text-gray-700 text-sm">{selectedOpening.description}</p>
                </div>
              )}

              {/* Strategic Ideas */}
              {selectedOpening.strategicIdeas && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 flex items-center mb-2">
                    <Zap className="mr-2 w-5 h-5 text-emerald-500" />
                    Strategic Ideas
                  </h3>
                  <p className="text-gray-700 text-sm">{selectedOpening.strategicIdeas}</p>
                </div>
              )}

              {/* Famous Games */}
              {selectedOpening.famousGames && selectedOpening.famousGames.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 flex items-center mb-2">
                    <ChevronRight className="mr-2 w-5 h-5 text-yellow-500" />
                    Famous Games
                  </h3>
                  <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                    {selectedOpening.famousGames.map((gameObj, index) => (
                      <li key={index} className="hover:text-indigo-600 transition-colors duration-300">
                        <strong>{gameObj.game}</strong> ({gameObj.year}, {gameObj.event}) –{" "}
                        {gameObj.moves}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Variations */}
              {selectedOpening.variations && selectedOpening.variations.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 flex items-center mb-2">
                    <ArrowRight className="mr-2 w-5 h-5 text-indigo-600" />
                    Variations
                  </h3>
                  <ul className="space-y-4">
                    {selectedOpening.variations.map((variation, index) => (
                      <li
                        key={`${variation.variationName}-${index}`}
                        className="p-4 bg-gray-100 rounded-lg shadow-sm hover:bg-indigo-50 transition-colors duration-300"
                      >
                        <h4 className="text-lg font-semibold text-gray-800">{variation.variationName}</h4>
                        {variation.description && (
                          <p className="text-gray-700 text-sm mt-2">
                            <span className="font-semibold">Description:</span>{" "}
                            {variation.description}
                          </p>
                        )}
                        {variation.strategicIdeas && (
                          <p className="text-gray-700 text-sm mt-2">
                            <span className="font-semibold">Strategic Ideas:</span>{" "}
                            {variation.strategicIdeas}
                          </p>
                        )}
                        {variation.famousGames && variation.famousGames.length > 0 && (
                          <div className="mt-2">
                            <span className="font-semibold text-gray-700">Famous Games:</span>
                            <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                              {variation.famousGames.map((fg, idx) => (
                                <li key={idx} className="hover:text-emerald-600 transition-colors duration-300">
                                  <strong>{fg.game}</strong> ({fg.year}, {fg.event}) – {fg.moves}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            // If not selected => show practice card
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="text-indigo-600">
                  {currentVariationName
                    ? `Practice: ${currentVariationName}`
                    : "Free Play Mode"}
                </CardTitle>
              </CardHeader>

              <CardContent className="flex-1 flex flex-row items-start justify-center p-4 space-x-8">
                {/* Chessboard container */}
                <div className="w-[600px] h-[600px] rounded-lg overflow-hidden shadow-md">
                  <chess-board
                    className="w-full h-full"
                    position={boardPosition}
                    draggable-pieces
                  />
                </div>

                {/* Controls */}
                <div className="flex flex-col items-start justify-start w-64 space-y-4">
                  {feedback && (
                    <Alert className="bg-blue-50 border-blue-200 w-full">
                      <AlertDescription className="text-blue-800 text-sm">
                        {feedback}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex flex-col space-y-2 w-full">
                    <button
                      onClick={handleResetBoard}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-300 w-full text-sm"
                    >
                      Reset Board
                    </button>

                    {/* Reset to Last if user is in practice mode, made a mistake, and lastFenIndex>0 */}
                    {currentMoves.length > 0 && wrongMove && lastFenIndex > 0 && (
                      <button
                        onClick={handleResetToLastPosition}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-300 w-full text-sm"
                      >
                        Reset to Last
                      </button>
                    )}

                    {/* Prev/Next if we have moves */}
                    {currentMoves.length > 0 && (
                      <div className="flex space-x-2 w-full">
                        <button
                          onClick={handlePrevMove}
                          className="flex-1 flex items-center justify-center px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors duration-300 text-sm"
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          <span>Prev</span>
                        </button>
                        <button
                          onClick={handleNextMove}
                          className="flex-1 flex items-center justify-center px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors duration-300 text-sm"
                        >
                          <span>Next</span>
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChessWiz;
