using UnityEngine;

namespace DeepStake.Construction
{
    public sealed class ModularBuildPieceDefinition : MonoBehaviour
    {
        public ModularBuildPieceId pieceId;
        public Vector3 nominalSizeMeters;
        public string buildRole;
        public string futureAssetPolicy;
    }
}
