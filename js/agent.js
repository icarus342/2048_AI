/* Modified by Justin Arnett */


// helper functions
function randomInt(n) {
    return Math.floor(Math.random() * n);
};

function AgentBrain(gameEngine) {
    this.size = 4;
    this.previousState = gameEngine.grid.serialize();
    this.reset();
    this.score = 0;
};

AgentBrain.prototype.reset = function () {
    this.score = 0;
    this.grid = new Grid(this.previousState.size, this.previousState.cells);
};

// Adds a tile in a random position
AgentBrain.prototype.addRandomTile = function () {
    if (this.grid.cellsAvailable()) {
        var value = Math.random() < 0.9 ? 2 : 4;
        var tile = new Tile(this.grid.randomAvailableCell(), value);

        this.grid.insertTile(tile);
    }
};

AgentBrain.prototype.moveTile = function (tile, cell) {
    this.grid.cells[tile.x][tile.y] = null;
    this.grid.cells[cell.x][cell.y] = tile;
    tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
AgentBrain.prototype.move = function (direction) {
    // 0: up, 1: right, 2: down, 3: left
    var self = this;

    var cell, tile;

    var vector = this.getVector(direction);
    var traversals = this.buildTraversals(vector);
    var moved = false;

    //console.log(vector);

    //console.log(traversals);

    // Traverse the grid in the right direction and move tiles
    traversals.x.forEach(function (x) {
        traversals.y.forEach(function (y) {
            cell = { x: x, y: y };
            tile = self.grid.cellContent(cell);

            if (tile) {
                var positions = self.findFarthestPosition(cell, vector);
                var next = self.grid.cellContent(positions.next);

                // Only one merger per row traversal?
                if (next && next.value === tile.value && !next.mergedFrom) {
                    var merged = new Tile(positions.next, tile.value * 2);
                    merged.mergedFrom = [tile, next];

                    self.grid.insertTile(merged);
                    self.grid.removeTile(tile);

                    // Converge the two tiles' positions
                    tile.updatePosition(positions.next);

                    // Update the score
                    self.score += merged.value;

                } else {
                    self.moveTile(tile, positions.farthest);
                }

                if (!self.positionsEqual(cell, tile)) {
                    moved = true; // The tile moved from its original cell!
                }
            }
        });
    });
    //console.log(moved);
    if (moved) {
        this.addRandomTile();
    }
    return moved;
};

// Get the vector representing the chosen direction
AgentBrain.prototype.getVector = function (direction) {
    // Vectors representing tile movement
    var map = {
        0: { x: 0, y: -1 }, // Up
        1: { x: 1, y: 0 },  // Right
        2: { x: 0, y: 1 },  // Down
        3: { x: -1, y: 0 }   // Left
    };

    return map[direction];
};

// Build a list of positions to traverse in the right order
AgentBrain.prototype.buildTraversals = function (vector) {
    var traversals = { x: [], y: [] };

    for (var pos = 0; pos < this.size; pos++) {
        traversals.x.push(pos);
        traversals.y.push(pos);
    }

    // Always traverse from the farthest cell in the chosen direction
    if (vector.x === 1) traversals.x = traversals.x.reverse();
    if (vector.y === 1) traversals.y = traversals.y.reverse();

    return traversals;
};

AgentBrain.prototype.findFarthestPosition = function (cell, vector) {
    var previous;

    // Progress towards the vector direction until an obstacle is found
    do {
        previous = cell;
        cell = { x: previous.x + vector.x, y: previous.y + vector.y };
    } while (this.grid.withinBounds(cell) &&
             this.grid.cellAvailable(cell));

    return {
        farthest: previous,
        next: cell // Used to check if a merge is required
    };
};

AgentBrain.prototype.positionsEqual = function (first, second) {
    return first.x === second.x && first.y === second.y;
};





/*
 * Modified by Justin Arnett
 * Version November 24, 2016
 * TCSS 435 - Assignment 2 2048
 *
 * AI agent that plays through games of 2048 using the
 * expectimax algorithm. Evaluation of grid game state
 * is based off of a weighted tile system that encourages
 * the AI to move higher value tiles towards the top left
 * of the grid. Evaluation is also based off of a smoothness
 * factor that encourages the AI to move tiles with the same
 * value adjacent to each other.
 */


function Agent() {
	this.depth = 4; // depth to search game tree states.
};

/* 
 * Selects the next move for the Agent to play in the game.
 *
 * Use the brain to simulate moves
 * brain.move(i) 
 * i = 0: up, 1: right, 2: down, 3: left
 * brain.reset() resets the brain to the current game board
 *
 * @Return     integer 0-3 representing the next move the AI will make.
 */
Agent.prototype.selectMove = function (gameManager) {
    var brain = new AgentBrain(gameManager);
	var optimalMoveScore = Number.MIN_VALUE;
	var optimalMove = 0;
	
	// Iterate through all possible moves.
	for (var i = 0; i < 4; i++) {
		//console.log("select move branch " + i);
		if (brain.ghostMove(i)) {
			//debugger;
			// if move is valid, evaluate score of move.
			var score = this.expectimax(brain, this.depth, true);
		
		    if (score >= optimalMoveScore) {
			    optimalMoveScore = score;
			    optimalMove = i;
		    }
		    brain.reset();
		}
	}
    return optimalMove;
};


/*
 * expectimax function that will be recursively called to
 * traverse the game tree of the current state of 2048.
 * Depth is limited to the depth value provided.
 *
 * @theBrain       The game state.
 * @depth          The current depth counter.
 * @isExpectPhase  Determines the section of the expectimax function
 *                 that will be executed.
 * @Return         The score for the explored move.
 */

Agent.prototype.expectimax = function (theBrain, depth, isExpectPhase) {
	
	/* Sentinel Case */
	if (depth == 0) {
		return this.evaluateGrid(theBrain);
	}
	
	/* Expectation phase of expectimax. */
	if (isExpectPhase) {
		var totalScore = 0;
		var availableCells = theBrain.grid.availableCells();
		var availableCellsCount = availableCells.length;
		for (var i = 0; i < availableCellsCount; i++) {
			
			// In the case a 2 spawns in tile i
			var tile2 = new Tile(availableCells[i], 2);
			theBrain.grid.insertTile(tile2);
			totalScore += 0.9 * this.expectimax(theBrain, depth-1, false);
			theBrain.grid.removeTile(tile2);
			
			// In the case a 4 spawns in tile i
			var tile4 = new Tile(availableCells[i], 4);
			theBrain.grid.insertTile(tile4);
			totalScore += 0.1 * this.expectimax(theBrain, depth-1, false);
			theBrain.grid.removeTile(tile4);
	    }
		return ( totalScore / availableCellsCount );
		
	} else { /* Maximum phase of expectimax. */
	    var brain = new AgentBrain(theBrain);
	    var optimalMoveScore = Number.MIN_VALUE;
	
		// Iterate through all possible moves.		
	    for (var i = 0; i < 4; i++) {
		    if (brain.ghostMove(i)) {
			    // if move is valid, evaluate score of move.
			    var score = this.expectimax(brain, depth-1, true);
		
		        if (score > optimalMoveScore) {
			        optimalMoveScore = score;
		        }
		        brain.reset();
		    }
	    }
		return optimalMoveScore;
		/* If no moves were valid, Number.MIN_VALUE will be returned. */
	}	
}


/*
 * Evaluates the current game state and calculates a score for it.
 *
 * @gameManager   The current game state to be evaluated.
 * @return        The score for the current game state.
 */
Agent.prototype.evaluateGrid = function (gameManager) {
    // calculate a score for the current grid configuration
	var score = 0;
	
	score += this.getGridWeightScore(gameManager);
	score += this.getSmoothnessScore(gameManager);
	return score;
};

/*
 * Applies a weight value, depending on the tile location,
 * to the value of the tile itself, then sum up all the scores
 * and return them.
 *
 * @theBrain    The current game state being evaluated.
 * @return      The grid weight score.
 */
Agent.prototype.getGridWeightScore = function (theBrain) {
	// Clone the game state (brain).
	var score = 0;
	
	var gridWeights = [[0.135759, 0.121925, 0.102812, 0.099937],
                       [0.0997992, 0.08884805, 0.076711, 0.0724143],
                       [0.060654, 0.0562579, 0.037116, 0.0161889],
                       [0.0125498, 0.00992495, 0.00575871, 0.00335193]];
	/*
	var gridWeights = [[0.135759, 0.121925, 0.102812, 0.099937],
                       [0.0724143, 0.076711, 0.08884805, 0.0917992],
                       [0.060654, 0.0562579, 0.037116, 0.0161889],
                       [0.00335193, 0.00575871, 0.00992495, 0.0125498]];
	*/
	/*  Weight values for each tile are taken from the blog on this website         */
	/*  https://codemyroad.wordpress.com/2014/05/14/2048-ai-the-intelligent-bot/    */
	
	for (var i = 0; i < 4; i++) {
		for (var k = 0; k < 4; k++) {
			
			var tileValue = 0;
			if (theBrain.grid.cells[i][k] != null) {
				tileValue = theBrain.grid.cells[i][k].value;
			}
			
			score += ( tileValue * gridWeights[i][k] );
		}
	}
	return score;
}

/*
 * Applies a score bonus for when tiles are adjacent to
 * other tiles of the same value. This will encourage the
 * AI to line up tiles for merges without needing to search
 * as deep for potential merges.
 *
 * @theBrain    The current game state being evaluated.
 * @return      The score for smoothness.
 */
Agent.prototype.getSmoothnessScore = function (theBrain) {
	var score = 0;
	
	for (var i = 0; i < 3; i++) {
		for (var k = 0; k < 4; k++) {
			
			var otherCellValue = 0;
			var cellValue = theBrain.grid.cells[i][k];
			if (i > 0) {
				otherCellValue = theBrain.grid.cells[i-1][k];
				/*
				if (otherCellValue == cellValue * 2 ||
				              otherCellValue == cellValue / 2 ) {
				    score += (0.05 * otherCellValue);
				} else */
				if (otherCellValue == cellValue) {
					score += (0.25 * otherCellValue);
				}
			}
			
			if (k > 0) {
				otherCellValue = theBrain.grid.cells[i][k-1];
				/*
				if (otherCellValue == cellValue * 2 ||
				              otherCellValue == cellValue / 2) {
				    score += (0.05 * otherCellValue);
				} else */
				if (otherCellValue == cellValue) {
					score += (0.25 * otherCellValue);
				}
			}
			
		}
	}
	return score;
}

/*
 * Moves tiles in a desired direction.
 * This is used instead of AgentBrain.move so the
 * expectimax algorithm can control the random
 * spawning tiles.
 */
AgentBrain.prototype.ghostMove = function (direction) {
    // 0: up, 1: right, 2: down, 3: left
    var self = this;

    var cell, tile;

    var vector = this.getVector(direction);
    var traversals = this.buildTraversals(vector);
    var moved = false;

    //console.log(vector);

    //console.log(traversals);

    // Traverse the grid in the right direction and move tiles
    traversals.x.forEach(function (x) {
        traversals.y.forEach(function (y) {
            cell = { x: x, y: y };
            tile = self.grid.cellContent(cell);

            if (tile) {
                var positions = self.findFarthestPosition(cell, vector);
                var next = self.grid.cellContent(positions.next);

                // Only one merger per row traversal?
                if (next && next.value === tile.value && !next.mergedFrom) {
                    var merged = new Tile(positions.next, tile.value * 2);
                    merged.mergedFrom = [tile, next];

                    self.grid.insertTile(merged);
                    self.grid.removeTile(tile);

                    // Converge the two tiles' positions
                    tile.updatePosition(positions.next);

                    // Update the score
                    //self.score += merged.value;

                } else {
                    self.moveTile(tile, positions.farthest);
                }

                if (!self.positionsEqual(cell, tile)) {
                    moved = true; // The tile moved from its original cell!
                }
            }
        });
    });
    //console.log(moved);
    //if (moved) {
    //    this.addRandomTile();
    //}
    return moved;
};
