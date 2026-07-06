"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkeletonCard = SkeletonCard;
exports.SkeletonList = SkeletonList;
exports.SkeletonText = SkeletonText;
function SkeletonCard({ className = '' }) {
    return (<div className={`bg-dark-800 rounded-2xl border border-white/5 overflow-hidden ${className}`}>
      <div className="p-4 space-y-3">
        <div className="h-4 bg-dark-700 rounded-lg w-3/4 animate-pulse"/>
        <div className="h-3 bg-dark-700 rounded-lg w-1/2 animate-pulse"/>
        <div className="h-3 bg-dark-700 rounded-lg w-2/3 animate-pulse"/>
      </div>
    </div>);
}
function SkeletonList({ count = 3 }) {
    return (<div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (<SkeletonCard key={i}/>))}
    </div>);
}
function SkeletonText({ className = '' }) {
    return <div className={`h-4 bg-dark-700 rounded-lg animate-pulse ${className}`}/>;
}
//# sourceMappingURL=SkeletonLoader.js.map