import React, { useState, useEffect } from "react"
import {
  BookOpen,
  ChevronRight,
  RefreshCw,
  Zap,
  ArrowLeft,
  ArrowRight,
  Maximize,
  Minimize
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Chess } from "chess.js"
import "chessboard-element"

const ChessWiz = () => {
  const [loading, setLoading] = useState(false)
  const [game] = useState(new Chess())

  // Opening & variation info
  const [currentOpeningId, setCurrentOpeningId] = useState(null)
  const [currentVariationName, setCurrentVariationName] = useState(null)

  // Moves for the currently selected variation
  const [currentMoves, setCurrentMoves] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)

  // Various states for messages, positions, etc.
  const [feedback, setFeedback] = useState("")
  const [wrongMove, setWrongMove] = useState(false)

  // The FEN after the last correct move
  const [lastFen, setLastFen] = useState("start")
  const [boardPosition, setBoardPosition] = useState("start")

  // Loaded openings from API (only has summary info)
  const [openings, setOpenings] = useState([])

  // Full detail for the currently selected opening
  const [selectedOpening, setSelectedOpening] = useState(null)

  // Fullscreen toggle
  const [isFullscreen, setIsFullscreen] = useState(false)

  // On mount, attach the "drop" event to chessboard
  useEffect(() => {
    const boardEl = document.querySelector("chess-board")
    if (boardEl) {
      boardEl.addEventListener("drop", handlePieceDrop)
    }
    return () => {
      if (boardEl) {
        boardEl.removeEventListener("drop", handlePieceDrop)
      }
    }
  }, [currentOpeningId, currentVariationName, currentIndex])

  /**
   * Fetch the short list of openings from /api/openings
   */
  const loadOpenings = async () => {
    setLoading(true)
    try {
      const resp = await fetch("/api/openings")
      if (!resp.ok) {
        setFeedback("Error loading openings.")
        return
      }
      const data = await resp.json()
      setOpenings(data)
    } catch (error) {
      console.error(error)
      setFeedback("Error fetching openings data.")
    } finally {
      setLoading(false)
    }
  }

  /**
   * When user selects an opening from the sidebar, fetch full details.
   */
  const handleSelectOpening = async (openingId) => {
    try {
      setFeedback("Loading opening details...")
      const resp = await fetch(`/api/openings/${openingId}`)
      if (!resp.ok) {
        setFeedback("Error loading the full opening details.")
        return
      }
      const data = await resp.json()
      setSelectedOpening(data)   // now we have description, strategicIdeas, etc.
      setFeedback("")
    } catch (err) {
      console.error(err)
      setFeedback("Error fetching the full opening details.")
    }
  }

  /**
   * Start practicing a variation (fetch the moves from /api/openings/<id>/<variation>)
   */
  const startVariationPractice = async (openingId, variationName) => {
    setCurrentOpeningId(openingId)
    setCurrentVariationName(variationName)
    setCurrentIndex(0)
    setCurrentMoves([])
    setFeedback("")
    setWrongMove(false)

    game.reset()
    setBoardPosition("start")
    setLastFen("start")

    try {
      const resp = await fetch(`/api/openings/${openingId}/${variationName}`)
      if (!resp.ok) {
        setFeedback("Error loading variation moves.")
        return
      }
      const movesData = await resp.json()
      if (!Array.isArray(movesData)) {
        setFeedback("Invalid variation data.")
        return
      }
      setCurrentMoves(movesData)
      setFeedback("Variation loaded. Make the first move!")
    } catch (error) {
      console.error(error)
      setFeedback("Error fetching variation data.")
    }
  }

  /**
   * If no variation is selected => freeplay
   * If a variation is selected => check correctness
   */
  const handlePieceDrop = (event) => {
    const { source, target, setAction } = event.detail

    // Free-play if no moves loaded
    if (currentMoves.length === 0) {
      const move = game.move({ from: source, to: target, promotion: "q" })
      if (!move) {
        // Illegal => silent snapback
        setAction("snapback")
      } else {
        setBoardPosition(game.fen())
      }
      return
    }

    // Variation loaded => check correctness
    const move = game.move({ from: source, to: target, promotion: "q" })
    if (!move) {
      // Actually illegal => silent snapback
      setAction("snapback")
      return
    }

    const userMove = move.san.toLowerCase()
    const correctNext = currentMoves[currentIndex]?.toLowerCase()

    if (correctNext && userMove === correctNext) {
      setFeedback(`Good job! Move: ${userMove}`)
      setWrongMove(false)
      setLastFen(game.fen())
      setBoardPosition(game.fen())
      setCurrentIndex(currentIndex + 1)
    } else {
      setAction("snapback")
      setFeedback("Wrong move!")
      setWrongMove(true)
    }
  }

  // Reset to last correct position
  const handleResetToLastPosition = () => {
    game.load(lastFen)
    setBoardPosition(lastFen)
    setFeedback("Reset to last correct move.")
    setWrongMove(false)
  }

  // Reset board entirely
  const handleResetBoard = () => {
    if (currentMoves.length > 0) {
      // We are in practice mode => reset same variation
      game.reset()
      setBoardPosition("start")
      setLastFen("start")
      setWrongMove(false)
      setCurrentIndex(0)
      setFeedback("Board reset for this opening. Move #1.")
    } else {
      // Free-play => just reset
      game.reset()
      setBoardPosition("start")
      setFeedback("Board reset in free-play mode.")
    }
  }

  // Enter freeplay mode
  const enterFreeplayMode = () => {
    setFeedback("Switched to freeplay mode.")
    setCurrentOpeningId(null)
    setCurrentVariationName(null)
    setSelectedOpening(null)
    setCurrentMoves([])
    setCurrentIndex(0)
    setWrongMove(false)
    setLastFen("start")

    game.reset()
    setBoardPosition("start")
  }

  // Next move
  const handleNextMove = () => {
    if (!currentMoves.length) return
    if (currentIndex < currentMoves.length) {
      const move = currentMoves[currentIndex]
      game.move(move)
      setBoardPosition(game.fen())
      setCurrentIndex(currentIndex + 1)
      setFeedback(`Forward move: ${move}`)
      setWrongMove(false)
      setLastFen(game.fen())
    } else {
      setFeedback("End of variation!")
    }
  }

  // Previous move
  const handlePrevMove = () => {
    if (!currentMoves.length) return
    if (currentIndex <= 0) {
      setFeedback("Already at the start!")
      return
    }
    game.undo()
    setBoardPosition(game.fen())
    setCurrentIndex(currentIndex - 1)
    setFeedback("Stepped back one move.")
    setWrongMove(false)
    setLastFen(game.fen())
  }

  // Random variation
  const handleRandomVariation = async () => {
    setFeedback("Loading random variation...")
    try {
      const resp = await fetch("/api/practice/random")
      if (!resp.ok) {
        setFeedback("No openings found or error.")
        return
      }
      const data = await resp.json()
      setFeedback(`Opening: ${data.openingId}, Variation: ${data.variationName}`)
      startVariationPractice(data.openingId, data.variationName)
    } catch (error) {
      console.error(error)
      setFeedback("Error fetching random variation.")
    }
  }

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      {/* TOP BAR */}
      <div className="flex-none p-4 bg-white dark:bg-gray-800 shadow flex justify-between items-center transition-colors duration-300">
        <div className="flex items-center space-x-3">
          {/* BookOpen Icon */}
          <BookOpen className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
          {/* Gradient App Name */}
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-transparent bg-clip-text">
            ChessWiz
          </h1>
        </div>
        <button
          onClick={enterFreeplayMode}
          className="px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
        >
          Freeplay Mode
        </button>
        <button
          onClick={toggleFullscreen}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-1"
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

      {/* CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar (only if not fullscreen) */}
        {!isFullscreen && (
          <div className="hidden md:block w-72 border-r border-gray-200 overflow-y-auto p-3">
            <div className="mb-2 flex gap-2">
              <button
                onClick={loadOpenings}
                className="flex-1 flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg shadow-md transition-all"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                <span>{loading ? "Loading..." : "Openings"}</span>
              </button>
              <button
                onClick={handleRandomVariation}
                className="flex-1 flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg shadow-md transition-all"
              >
                <Zap className="h-4 w-4" />
                <span>Random</span>
              </button>
            </div>

            {/* List of openings (summary) */}
            {openings.map((opening) => (
              <div
                key={opening.id}
                className="p-3 rounded-lg border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50 transition-all mb-2"
              >
                <div
                  className="flex justify-between items-center cursor-pointer"
                  onClick={() => handleSelectOpening(opening.id)}
                >
                  <h3 className="font-medium text-gray-900 text-sm">
                    {opening.openingName} ({opening.ecoCode})
                  </h3>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
                <div className="mt-2 flex gap-2 flex-wrap">
                  {opening.variations.map((variation) => (
                    <button
                      key={variation}
                      onClick={() => startVariationPractice(opening.id, variation)}
                      className="px-2 py-1 rounded bg-gray-100 hover:bg-indigo-100 text-xs text-gray-600 hover:text-indigo-600 transition-colors"
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
        <div className="flex-1 p-3">
          {/* If selectedOpening is set, show the full detail box */}
          {selectedOpening ? (
            <div className="p-6 bg-white rounded-lg shadow-md h-full flex flex-col relative overflow-hidden">
              {/* Title and ECO Code */}
              <div className="mb-4">
                <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                  {selectedOpening.openingName}
                  <span className="ml-2 px-2 py-1 text-sm text-gray-600 bg-gray-100 rounded">
                    ECO: {selectedOpening.ecoCode}
                  </span>
                </h2>
              </div>
          
              {/* Scrollable Content */}
              <div className="flex-1 overflow-auto pr-4">
                {/* Description */}
                {selectedOpening.description && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <BookOpen className="mr-2 w-5 h-5 text-indigo-500" />
                      Description
                    </h3>
                    <p className="text-gray-700 text-sm mt-2">{selectedOpening.description}</p>
                  </div>
                )}
          
                {/* Strategic Ideas */}
                {selectedOpening.strategicIdeas && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <Zap className="mr-2 w-5 h-5 text-green-500" />
                      Strategic Ideas
                    </h3>
                    <p className="text-gray-700 text-sm mt-2">{selectedOpening.strategicIdeas}</p>
                  </div>
                )}
          
                {/* Famous Games */}
                {selectedOpening.famousGames && selectedOpening.famousGames.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <ChevronRight className="mr-2 w-5 h-5 text-blue-500" />
                      Famous Games
                    </h3>
                    <ul className="list-disc list-inside text-gray-700 text-sm mt-2 space-y-1">
                      {selectedOpening.famousGames.map((gameObj, index) => (
                        <li key={index} className="hover:underline">
                          <strong>{gameObj.game}</strong> ({gameObj.year}, {gameObj.event}) –{" "}
                          {gameObj.moves}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
          
                {/* Variations */}
                {selectedOpening.variations && selectedOpening.variations.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <ArrowRight className="mr-2 w-5 h-5 text-orange-500" />
                      Variations
                    </h3>
                    <ul className="mt-2 space-y-2">
                      {selectedOpening.variations.map((variation, index) => (
                        <li
                          key={`${variation.variationName}-${index}`}
                          className="p-3 bg-gray-50 rounded-lg shadow-sm hover:bg-indigo-50 transition-all"
                        >
                          <h4 className="font-semibold text-gray-800">{variation.variationName}</h4>
                          {variation.description && (
                            <p className="text-gray-700 text-sm mt-1">
                              <span className="font-semibold">Description:</span>{" "}
                              {variation.description}
                            </p>
                          )}
                          {variation.strategicIdeas && (
                            <p className="text-gray-700 text-sm mt-1">
                              <span className="font-semibold">Strategic Ideas:</span>{" "}
                              {variation.strategicIdeas}
                            </p>
                          )}
                          {variation.famousGames && variation.famousGames.length > 0 && (
                            <div className="mt-2">
                              <span className="font-semibold text-sm text-gray-700">
                                Famous Games:
                              </span>
                              <ul className="list-disc list-inside text-gray-700 text-sm ml-4 space-y-1">
                                {variation.famousGames.map((fg, idx) => (
                                  <li key={idx} className="hover:underline">
                                    <strong>{fg.game}</strong> ({fg.year}, {fg.event}) –{" "}
                                    {fg.moves}
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
          
              {/* Close Button */}
              <button
                onClick={() => setSelectedOpening(null)}
                className="absolute top-4 right-4 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600"
              >
                ✕
              </button>
            </div>
          ) : (
            // If no opening selected, show the "Practice Mode" card
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>
                  {currentVariationName
                    ? `Practice: ${currentVariationName}`
                    : "Free Play Mode"}
                </CardTitle>
              </CardHeader>

              <CardContent className="flex-1 flex flex-row items-start justify-center p-4 space-x-8">
                {/* Chessboard container */}
                <div className="w-[600px] h-[600px] rounded-lg overflow-hidden shadow-md">
                  <chess-board
                    class="w-full h-full"
                    position={boardPosition}
                    draggable-pieces
                  />
                </div>

                {/* Feedback + Control Buttons */}
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
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 w-full text-sm"
                    >
                      Reset Board
                    </button>

                    {currentMoves.length > 0 && wrongMove && currentIndex > 0 && (
                      <button
                        onClick={handleResetToLastPosition}
                        className="px-4 py-2 bg-red-400 text-white rounded-lg hover:bg-red-600 w-full text-sm"
                      >
                        Reset to Last
                      </button>
                    )}

                    {currentMoves.length > 0 && (
                      <>
                        <button
                          onClick={handlePrevMove}
                          className="px-4 py-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 flex items-center justify-center space-x-1 text-sm"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>Prev</span>
                        </button>
                        <button
                          onClick={handleNextMove}
                          className="px-4 py-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 flex items-center justify-center space-x-1 text-sm"
                        >
                          <span>Next</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChessWiz
