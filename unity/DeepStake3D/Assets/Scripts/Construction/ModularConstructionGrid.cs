using System;
using System.Collections.Generic;
using UnityEngine;

namespace DeepStake.Construction
{
    [Serializable]
    public sealed class ModularConstructionChunk
    {
        public int chunkX;
        public int chunkY;
        public List<ModularConstructionTile> tiles = new List<ModularConstructionTile>();

        [NonSerialized] private Dictionary<Vector2Int, ModularConstructionTile> tileLookup;

        public ModularConstructionChunk()
        {
        }

        public ModularConstructionChunk(int chunkX, int chunkY)
        {
            this.chunkX = chunkX;
            this.chunkY = chunkY;
        }

        public bool HasTiles
        {
            get { return tiles.Count > 0; }
        }

        public ModularConstructionTile GetOrCreateTile(Vector2Int localTile)
        {
            EnsureLookup();
            if (tileLookup.TryGetValue(localTile, out var tile))
            {
                return tile;
            }

            tile = new ModularConstructionTile(localTile.x, localTile.y);
            tiles.Add(tile);
            tileLookup[localTile] = tile;
            return tile;
        }

        public bool TryGetTile(Vector2Int localTile, out ModularConstructionTile tile)
        {
            EnsureLookup();
            return tileLookup.TryGetValue(localTile, out tile);
        }

        public void RemoveTileIfEmpty(Vector2Int localTile)
        {
            if (!TryGetTile(localTile, out var tile) || tile.HasPieces)
            {
                return;
            }

            tiles.Remove(tile);
            tileLookup.Remove(localTile);
        }

        private void EnsureLookup()
        {
            if (tileLookup != null)
            {
                return;
            }

            tileLookup = new Dictionary<Vector2Int, ModularConstructionTile>();
            foreach (var tile in tiles)
            {
                tileLookup[new Vector2Int(tile.tileX, tile.tileY)] = tile;
            }
        }
    }

    [Serializable]
    public sealed class ModularConstructionTile
    {
        public int tileX;
        public int tileY;
        public List<PlacedBuildPiece> pieces = new List<PlacedBuildPiece>();

        public ModularConstructionTile()
        {
        }

        public ModularConstructionTile(int tileX, int tileY)
        {
            this.tileX = tileX;
            this.tileY = tileY;
        }

        public bool HasPieces
        {
            get { return pieces.Count > 0; }
        }
    }

    public sealed class ModularConstructionDataDiagnostics
    {
        public int sourceRecordCount;
        public int chunkCount;
        public int tileCount;
        public int chunkPieceReferences;
        public int duplicateRecordIds;
        public int invalidChunkTiles;
        public int outOfRangeTileReferences;
        public int missingChunkReferences;
        public int orphanedChunkReferences;
        public bool hasErrors;

        public string Summary
        {
            get
            {
                return "records=" + sourceRecordCount +
                    " chunks=" + chunkCount +
                    " tiles=" + tileCount +
                    " refs=" + chunkPieceReferences +
                    " duplicateIds=" + duplicateRecordIds +
                    " invalidTiles=" + invalidChunkTiles +
                    " outOfRangeRefs=" + outOfRangeTileReferences +
                    " missingRefs=" + missingChunkReferences +
                    " orphanRefs=" + orphanedChunkReferences;
            }
        }
    }
}
