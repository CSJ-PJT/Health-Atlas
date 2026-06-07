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

    public sealed class ModularConstructionChunkSummary
    {
        public int chunkX;
        public int chunkY;
        public int tileCount;
        public int pieceReferences;
        public int uniqueRecordCount;
        public int boundaryReferenceCount;

        public ModularConstructionChunkSummary(
            int chunkX,
            int chunkY,
            int tileCount,
            int pieceReferences,
            int uniqueRecordCount,
            int boundaryReferenceCount)
        {
            this.chunkX = chunkX;
            this.chunkY = chunkY;
            this.tileCount = tileCount;
            this.pieceReferences = pieceReferences;
            this.uniqueRecordCount = uniqueRecordCount;
            this.boundaryReferenceCount = boundaryReferenceCount;
        }
    }

    public sealed class ModularConstructionChunkRecordGroup
    {
        public int chunkX;
        public int chunkY;
        public List<PlacedBuildPiece> records = new List<PlacedBuildPiece>();
        public List<PlacedBuildPiece> originRecords = new List<PlacedBuildPiece>();
        public List<PlacedBuildPiece> boundaryRecords = new List<PlacedBuildPiece>();

        public ModularConstructionChunkRecordGroup(int chunkX, int chunkY)
        {
            this.chunkX = chunkX;
            this.chunkY = chunkY;
        }

        public int RecordCount
        {
            get { return records.Count; }
        }

        public int OriginRecordCount
        {
            get { return originRecords.Count; }
        }

        public int BoundaryRecordCount
        {
            get { return boundaryRecords.Count; }
        }
    }

    public sealed class ModularConstructionWorldChunkSummary
    {
        public int chunkCount;
        public int tileCount;
        public int pieceReferences;
        public int uniqueRecordCount;
        public int boundarySpanningRecordCount;
        public int minChunkX;
        public int minChunkY;
        public int maxChunkX;
        public int maxChunkY;
        public bool hasErrors;
        public string diagnosticsSummary;
        public List<ModularConstructionChunkSummary> chunks = new List<ModularConstructionChunkSummary>();

        public string Summary
        {
            get
            {
                return "chunks=" + chunkCount +
                    " tiles=" + tileCount +
                    " refs=" + pieceReferences +
                    " uniqueRecords=" + uniqueRecordCount +
                    " boundarySpanningRecords=" + boundarySpanningRecordCount +
                    " bounds=(" + minChunkX + "," + minChunkY + ")-(" + maxChunkX + "," + maxChunkY + ")" +
                    " errors=" + hasErrors;
            }
        }
    }
}
