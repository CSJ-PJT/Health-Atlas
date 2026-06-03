using System;
using UnityEngine;

namespace DeepStake.Construction
{
    [Serializable]
    public struct PlacedBuildPiece
    {
        public int recordId;
        public string pieceId;
        public int chunkX;
        public int chunkY;
        public int tileX;
        public int tileY;
        public int footprintWidthTiles;
        public int footprintDepthTiles;
        public int rotation;
        public string state;
        public float durability;
        public string resourceCostKey;
        public int resourceCostUnits;
        public string buildRequirementKey;
        public bool buildRequirementSatisfied;

        public PlacedBuildPiece(
            int recordId,
            ModularBuildPieceId pieceId,
            Vector2Int chunk,
            Vector2Int tile,
            Vector2Int footprintTiles,
            int rotation,
            string state = "built",
            float durability = 100f,
            string resourceCostKey = "placeholder",
            int resourceCostUnits = 1,
            string buildRequirementKey = "basic_construction",
            bool buildRequirementSatisfied = true)
        {
            this.recordId = recordId;
            this.pieceId = pieceId.ToString();
            chunkX = chunk.x;
            chunkY = chunk.y;
            tileX = tile.x;
            tileY = tile.y;
            footprintWidthTiles = Mathf.Max(1, footprintTiles.x);
            footprintDepthTiles = Mathf.Max(1, footprintTiles.y);
            this.rotation = rotation;
            this.state = state;
            this.durability = durability;
            this.resourceCostKey = resourceCostKey;
            this.resourceCostUnits = Mathf.Max(0, resourceCostUnits);
            this.buildRequirementKey = buildRequirementKey;
            this.buildRequirementSatisfied = buildRequirementSatisfied;
        }

        public PlacedBuildPiece(
            int recordId,
            ModularBuildPieceId pieceId,
            Vector2Int chunk,
            Vector2Int tile,
            int rotation,
            string state = "built",
            float durability = 100f,
            string resourceCostKey = "placeholder",
            int resourceCostUnits = 1,
            string buildRequirementKey = "basic_construction",
            bool buildRequirementSatisfied = true)
            : this(recordId, pieceId, chunk, tile, Vector2Int.one, rotation, state, durability, resourceCostKey, resourceCostUnits, buildRequirementKey, buildRequirementSatisfied)
        {
        }

        public PlacedBuildPiece(
            ModularBuildPieceId pieceId,
            Vector2Int chunk,
            Vector2Int tile,
            Vector2Int footprintTiles,
            int rotation,
            string state = "built",
            float durability = 100f,
            string resourceCostKey = "placeholder",
            int resourceCostUnits = 1,
            string buildRequirementKey = "basic_construction",
            bool buildRequirementSatisfied = true)
            : this(0, pieceId, chunk, tile, footprintTiles, rotation, state, durability, resourceCostKey, resourceCostUnits, buildRequirementKey, buildRequirementSatisfied)
        {
        }

        public PlacedBuildPiece(
            ModularBuildPieceId pieceId,
            Vector2Int chunk,
            Vector2Int tile,
            int rotation,
            string state = "built",
            float durability = 100f,
            string resourceCostKey = "placeholder",
            int resourceCostUnits = 1,
            string buildRequirementKey = "basic_construction",
            bool buildRequirementSatisfied = true)
            : this(0, pieceId, chunk, tile, Vector2Int.one, rotation, state, durability, resourceCostKey, resourceCostUnits, buildRequirementKey, buildRequirementSatisfied)
        {
        }
    }
}
