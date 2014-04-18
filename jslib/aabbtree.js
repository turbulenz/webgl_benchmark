// Copyright (c) 2009-2014 Turbulenz Limited
/*global Float32Array: false*/
;

//
// AABBTreeNode
//
var AABBTreeNode = (function () {
    function AABBTreeNode(extents, escapeNodeOffset, externalNode) {
        this.escapeNodeOffset = escapeNodeOffset;
        this.externalNode = externalNode;
        this.extents = extents;

        return this;
    }
    AABBTreeNode.prototype.isLeaf = function () {
        return !!this.externalNode;
    };

    AABBTreeNode.prototype.reset = function (minX, minY, minZ, maxX, maxY, maxZ, escapeNodeOffset, externalNode) {
        this.escapeNodeOffset = escapeNodeOffset;
        this.externalNode = externalNode;
        var oldExtents = this.extents;
        oldExtents[0] = minX;
        oldExtents[1] = minY;
        oldExtents[2] = minZ;
        oldExtents[3] = maxX;
        oldExtents[4] = maxY;
        oldExtents[5] = maxZ;
    };

    AABBTreeNode.prototype.clear = function () {
        this.escapeNodeOffset = 1;
        this.externalNode = undefined;
        var oldExtents = this.extents;
        var maxNumber = Number.MAX_VALUE;
        oldExtents[0] = maxNumber;
        oldExtents[1] = maxNumber;
        oldExtents[2] = maxNumber;
        oldExtents[3] = -maxNumber;
        oldExtents[4] = -maxNumber;
        oldExtents[5] = -maxNumber;
    };

    AABBTreeNode.create = // Constructor function
    function (extents, escapeNodeOffset, externalNode) {
        return new AABBTreeNode(extents, escapeNodeOffset, externalNode);
    };
    AABBTreeNode.version = 1;
    return AABBTreeNode;
})();

//
// AABBTree
//
var AABBTree = (function () {
    function AABBTree(highQuality) {
        this.numNodesLeaf = 4;
        this.nodes = [];
        this.endNode = 0;
        this.needsRebuild = false;
        this.needsRebound = false;
        this.numAdds = 0;
        this.numUpdates = 0;
        this.numExternalNodes = 0;
        this.startUpdate = 0x7FFFFFFF;
        this.endUpdate = -0x7FFFFFFF;
        this.highQuality = highQuality;
        this.ignoreY = false;
        this.nodesStack = new Array(32);
    }
    AABBTree.allocateNode = function () {
        var nodesPool = this.nodesPool;
        if (!nodesPool.length) {
            // Allocate a bunch of nodes in one go
            var nodesPoolAllocationSize = this.nodesPoolAllocationSize;
            var useFloat32Array = this.useFloat32Array;
            var extentsArray, extentsArrayIndex;
            if (useFloat32Array) {
                extentsArray = new Float32Array(nodesPoolAllocationSize * 6);
                extentsArrayIndex = 0;
            }
            var n, extents;
            for (n = 0; n < nodesPoolAllocationSize; n += 1) {
                if (useFloat32Array) {
                    extents = extentsArray.subarray(extentsArrayIndex, (extentsArrayIndex + 6));
                    extentsArrayIndex += 6;
                } else {
                    extents = [0, 0, 0, 0, 0, 0];
                }
                nodesPool[n] = AABBTreeNode.create(extents, 1, undefined);
            }
        }
        return nodesPool.pop();
    };

    AABBTree.releaseNode = function (node) {
        var nodesPool = this.nodesPool;
        if (nodesPool.length < this.nodesPoolAllocationSize) {
            node.clear();
            nodesPool.push(node);
        }
    };

    AABBTree.recycleNodes = function (nodes, start) {
        var numNodes = nodes.length;
        var n;
        for (n = start; n < numNodes; n += 1) {
            var node = nodes[n];
            if (node) {
                this.releaseNode(node);
            }
        }
        nodes.length = start;
    };

    AABBTree.prototype.add = function (externalNode, extents) {
        var endNode = this.endNode;
        externalNode.spatialIndex = endNode;

        var node = AABBTree.allocateNode();
        node.escapeNodeOffset = 1;
        node.externalNode = externalNode;
        var copyExtents = node.extents;
        copyExtents[0] = extents[0];
        copyExtents[1] = extents[1];
        copyExtents[2] = extents[2];
        copyExtents[3] = extents[3];
        copyExtents[4] = extents[4];
        copyExtents[5] = extents[5];

        this.nodes[endNode] = node;
        this.endNode = (endNode + 1);
        this.needsRebuild = true;
        this.numAdds += 1;
        this.numExternalNodes += 1;
    };

    AABBTree.prototype.remove = function (externalNode) {
        var index = externalNode.spatialIndex;
        if (index !== undefined) {
            if (this.numExternalNodes > 1) {
                var nodes = this.nodes;

                nodes[index].clear();

                var endNode = this.endNode;
                if ((index + 1) >= endNode) {
                    while (!nodes[endNode - 1].externalNode) {
                        endNode -= 1;
                    }
                    this.endNode = endNode;
                } else {
                    this.needsRebuild = true;
                }
                this.numExternalNodes -= 1;
            } else {
                this.clear();
            }

            externalNode.spatialIndex = undefined;
        }
    };

    AABBTree.prototype.findParent = function (nodeIndex) {
        var nodes = this.nodes;
        var parentIndex = nodeIndex;
        var nodeDist = 0;
        var parent;
        do {
            parentIndex -= 1;
            nodeDist += 1;
            parent = nodes[parentIndex];
        } while(parent.escapeNodeOffset <= nodeDist);
        return parent;
    };

    AABBTree.prototype.update = function (externalNode, extents) {
        var index = externalNode.spatialIndex;
        if (index !== undefined) {
            var min0 = extents[0];
            var min1 = extents[1];
            var min2 = extents[2];
            var max0 = extents[3];
            var max1 = extents[4];
            var max2 = extents[5];

            var needsRebuild = this.needsRebuild;
            var needsRebound = this.needsRebound;
            var nodes = this.nodes;
            var node = nodes[index];
            var nodeExtents = node.extents;

            var doUpdate = (needsRebuild || needsRebound || nodeExtents[0] > min0 || nodeExtents[1] > min1 || nodeExtents[2] > min2 || nodeExtents[3] < max0 || nodeExtents[4] < max1 || nodeExtents[5] < max2);

            nodeExtents[0] = min0;
            nodeExtents[1] = min1;
            nodeExtents[2] = min2;
            nodeExtents[3] = max0;
            nodeExtents[4] = max1;
            nodeExtents[5] = max2;

            if (doUpdate) {
                if (!needsRebuild && 1 < nodes.length) {
                    this.numUpdates += 1;
                    if (this.startUpdate > index) {
                        this.startUpdate = index;
                    }
                    if (this.endUpdate < index) {
                        this.endUpdate = index;
                    }
                    if (!needsRebound) {
                        if ((2 * this.numUpdates) > this.numExternalNodes) {
                            this.needsRebound = true;
                        } else {
                            var parent = this.findParent(index);
                            var parentExtents = parent.extents;
                            if (parentExtents[0] > min0 || parentExtents[1] > min1 || parentExtents[2] > min2 || parentExtents[3] < max0 || parentExtents[4] < max1 || parentExtents[5] < max2) {
                                this.needsRebound = true;
                            }
                        }
                    } else {
                        if (this.numUpdates > (3 * this.numExternalNodes)) {
                            this.needsRebuild = true;
                            this.numAdds = this.numUpdates;
                        }
                    }
                }
            }
        } else {
            this.add(externalNode, extents);
        }
    };

    AABBTree.prototype.needsFinalize = function () {
        return (this.needsRebuild || this.needsRebound);
    };

    AABBTree.prototype.finalize = function () {
        if (this.needsRebuild) {
            this.rebuild();
        } else if (this.needsRebound) {
            this.rebound();
        }
    };

    AABBTree.prototype.rebound = function () {
        var nodes = this.nodes;
        if (nodes.length > 1) {
            var startUpdateNodeIndex = this.startUpdate;
            var endUpdateNodeIndex = this.endUpdate;

            var nodesStack = this.nodesStack;
            var numNodesStack = 0;
            var topNodeIndex = 0;
            for (; ;) {
                var topNode = nodes[topNodeIndex];
                var currentNodeIndex = topNodeIndex;
                var currentEscapeNodeIndex = (topNodeIndex + topNode.escapeNodeOffset);
                var nodeIndex = (topNodeIndex + 1);
                var node;
                do {
                    node = nodes[nodeIndex];
                    var escapeNodeIndex = (nodeIndex + node.escapeNodeOffset);
                    if (nodeIndex < endUpdateNodeIndex) {
                        if (!node.externalNode) {
                            if (escapeNodeIndex > startUpdateNodeIndex) {
                                nodesStack[numNodesStack] = topNodeIndex;
                                numNodesStack += 1;
                                topNodeIndex = nodeIndex;
                            }
                        }
                    } else {
                        break;
                    }
                    nodeIndex = escapeNodeIndex;
                } while(nodeIndex < currentEscapeNodeIndex);

                if (topNodeIndex === currentNodeIndex) {
                    nodeIndex = (topNodeIndex + 1);
                    node = nodes[nodeIndex];

                    var extents = node.extents;
                    var minX = extents[0];
                    var minY = extents[1];
                    var minZ = extents[2];
                    var maxX = extents[3];
                    var maxY = extents[4];
                    var maxZ = extents[5];

                    nodeIndex = (nodeIndex + node.escapeNodeOffset);
                    while (nodeIndex < currentEscapeNodeIndex) {
                        node = nodes[nodeIndex];
                        extents = node.extents;

                        if (minX > extents[0]) {
                            minX = extents[0];
                        }
                        if (minY > extents[1]) {
                            minY = extents[1];
                        }
                        if (minZ > extents[2]) {
                            minZ = extents[2];
                        }
                        if (maxX < extents[3]) {
                            maxX = extents[3];
                        }
                        if (maxY < extents[4]) {
                            maxY = extents[4];
                        }
                        if (maxZ < extents[5]) {
                            maxZ = extents[5];
                        }

                        /*jshint white: true*/
                        nodeIndex = (nodeIndex + node.escapeNodeOffset);
                    }

                    extents = topNode.extents;
                    extents[0] = minX;
                    extents[1] = minY;
                    extents[2] = minZ;
                    extents[3] = maxX;
                    extents[4] = maxY;
                    extents[5] = maxZ;

                    endUpdateNodeIndex = topNodeIndex;

                    if (0 < numNodesStack) {
                        numNodesStack -= 1;
                        topNodeIndex = nodesStack[numNodesStack];
                    } else {
                        break;
                    }
                }
            }
        }

        this.needsRebuild = false;
        this.needsRebound = false;
        this.numAdds = 0;

        //this.numUpdates = 0;
        this.startUpdate = 0x7FFFFFFF;
        this.endUpdate = -0x7FFFFFFF;
    };

    AABBTree.prototype.rebuild = function () {
        if (this.numExternalNodes > 0) {
            var nodes = this.nodes;

            var n, buildNodes, numBuildNodes, endNodeIndex;

            if (this.numExternalNodes === nodes.length) {
                buildNodes = nodes;
                numBuildNodes = nodes.length;
                nodes = [];
                this.nodes = nodes;
            } else {
                buildNodes = [];
                buildNodes.length = this.numExternalNodes;
                numBuildNodes = 0;
                endNodeIndex = this.endNode;
                for (n = 0; n < endNodeIndex; n += 1) {
                    var currentNode = nodes[n];
                    if (currentNode.externalNode) {
                        nodes[n] = undefined;
                        buildNodes[numBuildNodes] = currentNode;
                        numBuildNodes += 1;
                    }
                }
                if (buildNodes.length > numBuildNodes) {
                    buildNodes.length = numBuildNodes;
                }
            }

            var rootNode;
            if (numBuildNodes > 1) {
                if (numBuildNodes > this.numNodesLeaf && this.numAdds > 0) {
                    if (this.highQuality) {
                        this._sortNodesHighQuality(buildNodes);
                    } else if (this.ignoreY) {
                        this._sortNodesNoY(buildNodes);
                    } else {
                        this._sortNodes(buildNodes);
                    }
                }

                var predictedNumNodes = this._predictNumNodes(0, numBuildNodes, 0);
                if (nodes.length > predictedNumNodes) {
                    AABBTree.recycleNodes(nodes, predictedNumNodes);
                }

                this._recursiveBuild(buildNodes, 0, numBuildNodes, 0);

                endNodeIndex = nodes[0].escapeNodeOffset;
                if (nodes.length > endNodeIndex) {
                    AABBTree.recycleNodes(nodes, endNodeIndex);
                }
                this.endNode = endNodeIndex;

                // Check if we should take into account the Y coordinate
                rootNode = nodes[0];
                var extents = rootNode.extents;
                var deltaX = (extents[3] - extents[0]);
                var deltaY = (extents[4] - extents[1]);
                var deltaZ = (extents[5] - extents[2]);
                this.ignoreY = ((4 * deltaY) < (deltaX <= deltaZ ? deltaX : deltaZ));
            } else {
                rootNode = buildNodes[0];
                rootNode.externalNode.spatialIndex = 0;
                nodes.length = 1;
                nodes[0] = rootNode;
                this.endNode = 1;
            }
            buildNodes = null;
        }

        this.needsRebuild = false;
        this.needsRebound = false;
        this.numAdds = 0;
        this.numUpdates = 0;
        this.startUpdate = 0x7FFFFFFF;
        this.endUpdate = -0x7FFFFFFF;
    };

    AABBTree.prototype._sortNodes = function (nodes) {
        var numNodesLeaf = this.numNodesLeaf;
        var numNodes = nodes.length;

        function getkeyXfn(node) {
            var extents = node.extents;
            return (extents[0] + extents[3]);
        }

        function getkeyYfn(node) {
            var extents = node.extents;
            return (extents[1] + extents[4]);
        }

        function getkeyZfn(node) {
            var extents = node.extents;
            return (extents[2] + extents[5]);
        }

        function getreversekeyXfn(node) {
            var extents = node.extents;
            return -(extents[0] + extents[3]);
        }

        function getreversekeyYfn(node) {
            var extents = node.extents;
            return -(extents[1] + extents[4]);
        }

        function getreversekeyZfn(node) {
            var extents = node.extents;
            return -(extents[2] + extents[5]);
        }

        var nthElement = this._nthElement;
        var reverse = false;
        var axis = 0;

        function sortNodesRecursive(nodes, startIndex, endIndex) {
            /* tslint:disable:no-bitwise */
            var splitNodeIndex = ((startIndex + endIndex) >> 1);

            if (axis === 0) {
                if (reverse) {
                    nthElement(nodes, startIndex, splitNodeIndex, endIndex, getreversekeyXfn);
                } else {
                    nthElement(nodes, startIndex, splitNodeIndex, endIndex, getkeyXfn);
                }
            } else if (axis === 2) {
                if (reverse) {
                    nthElement(nodes, startIndex, splitNodeIndex, endIndex, getreversekeyZfn);
                } else {
                    nthElement(nodes, startIndex, splitNodeIndex, endIndex, getkeyZfn);
                }
            } else {
                if (reverse) {
                    nthElement(nodes, startIndex, splitNodeIndex, endIndex, getreversekeyYfn);
                } else {
                    nthElement(nodes, startIndex, splitNodeIndex, endIndex, getkeyYfn);
                }
            }

            if (axis === 0) {
                axis = 2;
            } else if (axis === 2) {
                axis = 1;
            } else {
                axis = 0;
            }

            reverse = !reverse;

            if ((startIndex + numNodesLeaf) < splitNodeIndex) {
                sortNodesRecursive(nodes, startIndex, splitNodeIndex);
            }

            if ((splitNodeIndex + numNodesLeaf) < endIndex) {
                sortNodesRecursive(nodes, splitNodeIndex, endIndex);
            }
        }

        sortNodesRecursive(nodes, 0, numNodes);
    };

    AABBTree.prototype._sortNodesNoY = function (nodes) {
        var numNodesLeaf = this.numNodesLeaf;
        var numNodes = nodes.length;

        function getkeyXfn(node) {
            var extents = node.extents;
            return (extents[0] + extents[3]);
        }

        function getkeyZfn(node) {
            var extents = node.extents;
            return (extents[2] + extents[5]);
        }

        function getreversekeyXfn(node) {
            var extents = node.extents;
            return -(extents[0] + extents[3]);
        }

        function getreversekeyZfn(node) {
            var extents = node.extents;
            return -(extents[2] + extents[5]);
        }

        var nthElement = this._nthElement;
        var reverse = false;
        var axis = 0;

        function sortNodesNoYRecursive(nodes, startIndex, endIndex) {
            /* tslint:disable:no-bitwise */
            var splitNodeIndex = ((startIndex + endIndex) >> 1);

            if (axis === 0) {
                if (reverse) {
                    nthElement(nodes, startIndex, splitNodeIndex, endIndex, getreversekeyXfn);
                } else {
                    nthElement(nodes, startIndex, splitNodeIndex, endIndex, getkeyXfn);
                }
            } else {
                if (reverse) {
                    nthElement(nodes, startIndex, splitNodeIndex, endIndex, getreversekeyZfn);
                } else {
                    nthElement(nodes, startIndex, splitNodeIndex, endIndex, getkeyZfn);
                }
            }

            if (axis === 0) {
                axis = 2;
            } else {
                axis = 0;
            }

            reverse = !reverse;

            if ((startIndex + numNodesLeaf) < splitNodeIndex) {
                sortNodesNoYRecursive(nodes, startIndex, splitNodeIndex);
            }

            if ((splitNodeIndex + numNodesLeaf) < endIndex) {
                sortNodesNoYRecursive(nodes, splitNodeIndex, endIndex);
            }
        }

        sortNodesNoYRecursive(nodes, 0, numNodes);
    };

    AABBTree.prototype._sortNodesHighQuality = function (nodes) {
        var numNodesLeaf = this.numNodesLeaf;
        var numNodes = nodes.length;

        function getkeyXfn(node) {
            var extents = node.extents;
            return (extents[0] + extents[3]);
        }

        function getkeyYfn(node) {
            var extents = node.extents;
            return (extents[1] + extents[4]);
        }

        function getkeyZfn(node) {
            var extents = node.extents;
            return (extents[2] + extents[5]);
        }

        function getkeyXZfn(node) {
            var extents = node.extents;
            return (extents[0] + extents[2] + extents[3] + extents[5]);
        }

        function getkeyZXfn(node) {
            var extents = node.extents;
            return (extents[0] - extents[2] + extents[3] - extents[5]);
        }

        function getreversekeyXfn(node) {
            var extents = node.extents;
            return -(extents[0] + extents[3]);
        }

        function getreversekeyYfn(node) {
            var extents = node.extents;
            return -(extents[1] + extents[4]);
        }

        function getreversekeyZfn(node) {
            var extents = node.extents;
            return -(extents[2] + extents[5]);
        }

        function getreversekeyXZfn(node) {
            var extents = node.extents;
            return -(extents[0] + extents[2] + extents[3] + extents[5]);
        }

        function getreversekeyZXfn(node) {
            var extents = node.extents;
            return -(extents[0] - extents[2] + extents[3] - extents[5]);
        }

        var nthElement = this._nthElement;
        var calculateSAH = this._calculateSAH;
        var reverse = false;

        function sortNodesHighQualityRecursive(nodes, startIndex, endIndex) {
            /* tslint:disable:no-bitwise */
            var splitNodeIndex = ((startIndex + endIndex) >> 1);

            /* tslint:enable:no-bitwise */
            nthElement(nodes, startIndex, splitNodeIndex, endIndex, getkeyXfn);
            var sahX = (calculateSAH(nodes, startIndex, splitNodeIndex) + calculateSAH(nodes, splitNodeIndex, endIndex));

            nthElement(nodes, startIndex, splitNodeIndex, endIndex, getkeyYfn);
            var sahY = (calculateSAH(nodes, startIndex, splitNodeIndex) + calculateSAH(nodes, splitNodeIndex, endIndex));

            nthElement(nodes, startIndex, splitNodeIndex, endIndex, getkeyZfn);
            var sahZ = (calculateSAH(nodes, startIndex, splitNodeIndex) + calculateSAH(nodes, splitNodeIndex, endIndex));

            nthElement(nodes, startIndex, splitNodeIndex, endIndex, getkeyXZfn);
            var sahXZ = (calculateSAH(nodes, startIndex, splitNodeIndex) + calculateSAH(nodes, splitNodeIndex, endIndex));

            nthElement(nodes, startIndex, splitNodeIndex, endIndex, getkeyZXfn);
            var sahZX = (calculateSAH(nodes, startIndex, splitNodeIndex) + calculateSAH(nodes, splitNodeIndex, endIndex));

            if (sahX <= sahY && sahX <= sahZ && sahX <= sahXZ && sahX <= sahZX) {
                if (reverse) {
                    nthElement(nodes, startIndex, splitNodeIndex, endIndex, getreversekeyXfn);
                } else {
                    nthElement(nodes, startIndex, splitNodeIndex, endIndex, getkeyXfn);
                }
            } else if (sahZ <= sahY && sahZ <= sahXZ && sahZ <= sahZX) {
                if (reverse) {
                    nthElement(nodes, startIndex, splitNodeIndex, endIndex, getreversekeyZfn);
                } else {
                    nthElement(nodes, startIndex, splitNodeIndex, endIndex, getkeyZfn);
                }
            } else if (sahY <= sahXZ && sahY <= sahZX) {
                if (reverse) {
                    nthElement(nodes, startIndex, splitNodeIndex, endIndex, getreversekeyYfn);
                } else {
                    nthElement(nodes, startIndex, splitNodeIndex, endIndex, getkeyYfn);
                }
            } else if (sahXZ <= sahZX) {
                if (reverse) {
                    nthElement(nodes, startIndex, splitNodeIndex, endIndex, getreversekeyXZfn);
                } else {
                    nthElement(nodes, startIndex, splitNodeIndex, endIndex, getkeyXZfn);
                }
            } else {
                if (reverse) {
                    nthElement(nodes, startIndex, splitNodeIndex, endIndex, getreversekeyZXfn);
                } else {
                    nthElement(nodes, startIndex, splitNodeIndex, endIndex, getkeyZXfn);
                }
            }

            reverse = !reverse;

            if ((startIndex + numNodesLeaf) < splitNodeIndex) {
                sortNodesHighQualityRecursive(nodes, startIndex, splitNodeIndex);
            }

            if ((splitNodeIndex + numNodesLeaf) < endIndex) {
                sortNodesHighQualityRecursive(nodes, splitNodeIndex, endIndex);
            }
        }

        sortNodesHighQualityRecursive(nodes, 0, numNodes);
    };

    AABBTree.prototype._calculateSAH = function (buildNodes, startIndex, endIndex) {
        var buildNode, extents, minX, minY, minZ, maxX, maxY, maxZ;

        buildNode = buildNodes[startIndex];
        extents = buildNode.extents;
        minX = extents[0];
        minY = extents[1];
        minZ = extents[2];
        maxX = extents[3];
        maxY = extents[4];
        maxZ = extents[5];

        for (var n = (startIndex + 1); n < endIndex; n += 1) {
            buildNode = buildNodes[n];
            extents = buildNode.extents;

            if (minX > extents[0]) {
                minX = extents[0];
            }
            if (minY > extents[1]) {
                minY = extents[1];
            }
            if (minZ > extents[2]) {
                minZ = extents[2];
            }
            if (maxX < extents[3]) {
                maxX = extents[3];
            }
            if (maxY < extents[4]) {
                maxY = extents[4];
            }
            if (maxZ < extents[5]) {
                maxZ = extents[5];
            }
            /*jshint white: true*/
        }

        return ((maxX - minX) + (maxY - minY) + (maxZ - minZ));
    };

    AABBTree.prototype._nthElement = function (nodes, first, nth, last, getkey) {
        function medianFn(a, b, c) {
            if (a < b) {
                if (b < c) {
                    return b;
                } else if (a < c) {
                    return c;
                } else {
                    return a;
                }
            } else if (a < c) {
                return a;
            } else if (b < c) {
                return c;
            }
            return b;
        }

        function insertionSortFn(nodes, first, last, getkey) {
            var sorted = (first + 1);
            while (sorted !== last) {
                var tempNode = nodes[sorted];
                var tempKey = getkey(tempNode);

                var next = sorted;
                var current = (sorted - 1);

                while (next !== first && tempKey < getkey(nodes[current])) {
                    nodes[next] = nodes[current];
                    next -= 1;
                    current -= 1;
                }

                if (next !== sorted) {
                    nodes[next] = tempNode;
                }

                sorted += 1;
            }
        }

        while ((last - first) > 8) {
            /* tslint:disable:no-bitwise */
            var midValue = medianFn(getkey(nodes[first]), getkey(nodes[first + ((last - first) >> 1)]), getkey(nodes[last - 1]));

            /* tslint:enable:no-bitwise */
            var firstPos = first;
            var lastPos = last;
            var midPos;
            for (; ; firstPos += 1) {
                while (getkey(nodes[firstPos]) < midValue) {
                    firstPos += 1;
                }

                do {
                    lastPos -= 1;
                } while(midValue < getkey(nodes[lastPos]));

                if (firstPos >= lastPos) {
                    midPos = firstPos;
                    break;
                } else {
                    var temp = nodes[firstPos];
                    nodes[firstPos] = nodes[lastPos];
                    nodes[lastPos] = temp;
                }
            }

            if (midPos <= nth) {
                first = midPos;
            } else {
                last = midPos;
            }
        }

        insertionSortFn(nodes, first, last, getkey);
    };

    AABBTree.prototype._recursiveBuild = function (buildNodes, startIndex, endIndex, lastNodeIndex) {
        var nodes = this.nodes;
        var nodeIndex = lastNodeIndex;
        lastNodeIndex += 1;

        var minX, minY, minZ, maxX, maxY, maxZ, extents;
        var buildNode, lastNode;

        if ((startIndex + this.numNodesLeaf) >= endIndex) {
            buildNode = buildNodes[startIndex];
            extents = buildNode.extents;
            minX = extents[0];
            minY = extents[1];
            minZ = extents[2];
            maxX = extents[3];
            maxY = extents[4];
            maxZ = extents[5];

            buildNode.externalNode.spatialIndex = lastNodeIndex;
            this._replaceNode(nodes, lastNodeIndex, buildNode);

            for (var n = (startIndex + 1); n < endIndex; n += 1) {
                buildNode = buildNodes[n];
                extents = buildNode.extents;

                if (minX > extents[0]) {
                    minX = extents[0];
                }
                if (minY > extents[1]) {
                    minY = extents[1];
                }
                if (minZ > extents[2]) {
                    minZ = extents[2];
                }
                if (maxX < extents[3]) {
                    maxX = extents[3];
                }
                if (maxY < extents[4]) {
                    maxY = extents[4];
                }
                if (maxZ < extents[5]) {
                    maxZ = extents[5];
                }

                /*jshint white: true*/
                lastNodeIndex += 1;
                buildNode.externalNode.spatialIndex = lastNodeIndex;
                this._replaceNode(nodes, lastNodeIndex, buildNode);
            }

            lastNode = nodes[lastNodeIndex];
        } else {
            /* tslint:disable:no-bitwise */
            var splitPosIndex = ((startIndex + endIndex) >> 1);

            if ((startIndex + 1) >= splitPosIndex) {
                buildNode = buildNodes[startIndex];
                buildNode.externalNode.spatialIndex = lastNodeIndex;
                this._replaceNode(nodes, lastNodeIndex, buildNode);
            } else {
                this._recursiveBuild(buildNodes, startIndex, splitPosIndex, lastNodeIndex);
            }

            lastNode = nodes[lastNodeIndex];
            extents = lastNode.extents;
            minX = extents[0];
            minY = extents[1];
            minZ = extents[2];
            maxX = extents[3];
            maxY = extents[4];
            maxZ = extents[5];

            lastNodeIndex = (lastNodeIndex + lastNode.escapeNodeOffset);

            if ((splitPosIndex + 1) >= endIndex) {
                buildNode = buildNodes[splitPosIndex];
                buildNode.externalNode.spatialIndex = lastNodeIndex;
                this._replaceNode(nodes, lastNodeIndex, buildNode);
            } else {
                this._recursiveBuild(buildNodes, splitPosIndex, endIndex, lastNodeIndex);
            }

            lastNode = nodes[lastNodeIndex];
            extents = lastNode.extents;

            if (minX > extents[0]) {
                minX = extents[0];
            }
            if (minY > extents[1]) {
                minY = extents[1];
            }
            if (minZ > extents[2]) {
                minZ = extents[2];
            }
            if (maxX < extents[3]) {
                maxX = extents[3];
            }
            if (maxY < extents[4]) {
                maxY = extents[4];
            }
            if (maxZ < extents[5]) {
                maxZ = extents[5];
            }
            /*jshint white: true*/
        }

        var node = nodes[nodeIndex];
        if (node === undefined) {
            nodes[nodeIndex] = node = AABBTree.allocateNode();
        }
        node.reset(minX, minY, minZ, maxX, maxY, maxZ, (lastNodeIndex + lastNode.escapeNodeOffset - nodeIndex));
    };

    AABBTree.prototype._replaceNode = function (nodes, nodeIndex, newNode) {
        var oldNode = nodes[nodeIndex];
        nodes[nodeIndex] = newNode;
        if (oldNode !== undefined) {
            AABBTree.releaseNode(oldNode);
        }
    };

    AABBTree.prototype._predictNumNodes = function (startIndex, endIndex, lastNodeIndex) {
        lastNodeIndex += 1;

        if ((startIndex + this.numNodesLeaf) >= endIndex) {
            lastNodeIndex += (endIndex - startIndex);
        } else {
            /* tslint:disable:no-bitwise */
            var splitPosIndex = ((startIndex + endIndex) >> 1);

            if ((startIndex + 1) >= splitPosIndex) {
                lastNodeIndex += 1;
            } else {
                lastNodeIndex = this._predictNumNodes(startIndex, splitPosIndex, lastNodeIndex);
            }

            if ((splitPosIndex + 1) >= endIndex) {
                lastNodeIndex += 1;
            } else {
                lastNodeIndex = this._predictNumNodes(splitPosIndex, endIndex, lastNodeIndex);
            }
        }

        return lastNodeIndex;
    };

    AABBTree.prototype.getVisibleNodes = function (planes, visibleNodes, startIndex) {
        var numVisibleNodes = 0;
        if (this.numExternalNodes > 0) {
            var nodes = this.nodes;
            var endNodeIndex = this.endNode;
            var numPlanes = planes.length;
            var storageIndex = (startIndex === undefined) ? visibleNodes.length : startIndex;
            var node, extents, endChildren;
            var n0, n1, n2, p0, p1, p2;
            var isInside, n, plane, d0, d1, d2, distance;
            var nodeIndex = 0;

            for (; ;) {
                node = nodes[nodeIndex];
                extents = node.extents;
                n0 = extents[0];
                n1 = extents[1];
                n2 = extents[2];
                p0 = extents[3];
                p1 = extents[4];
                p2 = extents[5];

                //isInsidePlanesAABB
                isInside = true;
                n = 0;
                do {
                    plane = planes[n];
                    d0 = plane[0];
                    d1 = plane[1];
                    d2 = plane[2];
                    distance = (d0 * (d0 < 0 ? n0 : p0) + d1 * (d1 < 0 ? n1 : p1) + d2 * (d2 < 0 ? n2 : p2));
                    if (distance < plane[3]) {
                        isInside = false;
                        break;
                    }
                    n += 1;
                } while(n < numPlanes);
                if (isInside) {
                    if (node.externalNode) {
                        visibleNodes[storageIndex] = node.externalNode;
                        storageIndex += 1;
                        numVisibleNodes += 1;
                        nodeIndex += 1;
                        if (nodeIndex >= endNodeIndex) {
                            break;
                        }
                    } else {
                        //isFullyInsidePlanesAABB
                        isInside = true;
                        n = 0;
                        do {
                            plane = planes[n];
                            d0 = plane[0];
                            d1 = plane[1];
                            d2 = plane[2];
                            distance = (d0 * (d0 > 0 ? n0 : p0) + d1 * (d1 > 0 ? n1 : p1) + d2 * (d2 > 0 ? n2 : p2));
                            if (distance < plane[3]) {
                                isInside = false;
                                break;
                            }
                            n += 1;
                        } while(n < numPlanes);
                        if (isInside) {
                            endChildren = (nodeIndex + node.escapeNodeOffset);
                            nodeIndex += 1;
                            do {
                                node = nodes[nodeIndex];
                                if (node.externalNode) {
                                    visibleNodes[storageIndex] = node.externalNode;
                                    storageIndex += 1;
                                    numVisibleNodes += 1;
                                }
                                nodeIndex += 1;
                            } while(nodeIndex < endChildren);
                            if (nodeIndex >= endNodeIndex) {
                                break;
                            }
                        } else {
                            nodeIndex += 1;
                        }
                    }
                } else {
                    nodeIndex += node.escapeNodeOffset;
                    if (nodeIndex >= endNodeIndex) {
                        break;
                    }
                }
            }
        }
        return numVisibleNodes;
    };

    AABBTree.prototype.getOverlappingNodes = function (queryExtents, overlappingNodes, startIndex) {
        if (this.numExternalNodes > 0) {
            var queryMinX = queryExtents[0];
            var queryMinY = queryExtents[1];
            var queryMinZ = queryExtents[2];
            var queryMaxX = queryExtents[3];
            var queryMaxY = queryExtents[4];
            var queryMaxZ = queryExtents[5];
            var nodes = this.nodes;
            var endNodeIndex = this.endNode;
            var node, extents, endChildren;
            var numOverlappingNodes = 0;
            var storageIndex = (startIndex === undefined) ? overlappingNodes.length : startIndex;
            var nodeIndex = 0;
            for (; ;) {
                node = nodes[nodeIndex];
                extents = node.extents;
                var minX = extents[0];
                var minY = extents[1];
                var minZ = extents[2];
                var maxX = extents[3];
                var maxY = extents[4];
                var maxZ = extents[5];
                if (queryMinX <= maxX && queryMinY <= maxY && queryMinZ <= maxZ && queryMaxX >= minX && queryMaxY >= minY && queryMaxZ >= minZ) {
                    if (node.externalNode) {
                        overlappingNodes[storageIndex] = node.externalNode;
                        storageIndex += 1;
                        numOverlappingNodes += 1;
                        nodeIndex += 1;
                        if (nodeIndex >= endNodeIndex) {
                            break;
                        }
                    } else {
                        if (queryMaxX >= maxX && queryMaxY >= maxY && queryMaxZ >= maxZ && queryMinX <= minX && queryMinY <= minY && queryMinZ <= minZ) {
                            endChildren = (nodeIndex + node.escapeNodeOffset);
                            nodeIndex += 1;
                            do {
                                node = nodes[nodeIndex];
                                if (node.externalNode) {
                                    overlappingNodes[storageIndex] = node.externalNode;
                                    storageIndex += 1;
                                    numOverlappingNodes += 1;
                                }
                                nodeIndex += 1;
                            } while(nodeIndex < endChildren);
                            if (nodeIndex >= endNodeIndex) {
                                break;
                            }
                        } else {
                            nodeIndex += 1;
                        }
                    }
                } else {
                    nodeIndex += node.escapeNodeOffset;
                    if (nodeIndex >= endNodeIndex) {
                        break;
                    }
                }
            }
            return numOverlappingNodes;
        } else {
            return 0;
        }
    };

    AABBTree.prototype.getSphereOverlappingNodes = function (center, radius, overlappingNodes) {
        if (this.numExternalNodes > 0) {
            var radiusSquared = (radius * radius);
            var centerX = center[0];
            var centerY = center[1];
            var centerZ = center[2];
            var nodes = this.nodes;
            var endNodeIndex = this.endNode;
            var node, extents;
            var numOverlappingNodes = overlappingNodes.length;
            var nodeIndex = 0;
            for (; ;) {
                node = nodes[nodeIndex];
                extents = node.extents;
                var minX = extents[0];
                var minY = extents[1];
                var minZ = extents[2];
                var maxX = extents[3];
                var maxY = extents[4];
                var maxZ = extents[5];
                var totalDistance = 0, sideDistance;
                if (centerX < minX) {
                    sideDistance = (minX - centerX);
                    totalDistance += (sideDistance * sideDistance);
                } else if (centerX > maxX) {
                    sideDistance = (centerX - maxX);
                    totalDistance += (sideDistance * sideDistance);
                }
                if (centerY < minY) {
                    sideDistance = (minY - centerY);
                    totalDistance += (sideDistance * sideDistance);
                } else if (centerY > maxY) {
                    sideDistance = (centerY - maxY);
                    totalDistance += (sideDistance * sideDistance);
                }
                if (centerZ < minZ) {
                    sideDistance = (minZ - centerZ);
                    totalDistance += (sideDistance * sideDistance);
                } else if (centerZ > maxZ) {
                    sideDistance = (centerZ - maxZ);
                    totalDistance += (sideDistance * sideDistance);
                }
                if (totalDistance <= radiusSquared) {
                    nodeIndex += 1;
                    if (node.externalNode) {
                        overlappingNodes[numOverlappingNodes] = node.externalNode;
                        numOverlappingNodes += 1;
                        if (nodeIndex >= endNodeIndex) {
                            break;
                        }
                    }
                } else {
                    nodeIndex += node.escapeNodeOffset;
                    if (nodeIndex >= endNodeIndex) {
                        break;
                    }
                }
            }
        }
    };

    AABBTree.prototype.getOverlappingPairs = function (overlappingPairs, startIndex) {
        if (this.numExternalNodes > 0) {
            var nodes = this.nodes;
            var endNodeIndex = this.endNode;
            var currentNode, currentExternalNode, node, extents;
            var numInsertions = 0;
            var storageIndex = (startIndex === undefined) ? overlappingPairs.length : startIndex;
            var currentNodeIndex = 0, nodeIndex;
            for (; ;) {
                currentNode = nodes[currentNodeIndex];
                while (!currentNode.externalNode) {
                    currentNodeIndex += 1;
                    currentNode = nodes[currentNodeIndex];
                }

                currentNodeIndex += 1;
                if (currentNodeIndex < endNodeIndex) {
                    currentExternalNode = currentNode.externalNode;
                    extents = currentNode.extents;
                    var minX = extents[0];
                    var minY = extents[1];
                    var minZ = extents[2];
                    var maxX = extents[3];
                    var maxY = extents[4];
                    var maxZ = extents[5];

                    nodeIndex = currentNodeIndex;
                    for (; ;) {
                        node = nodes[nodeIndex];
                        extents = node.extents;
                        if (minX <= extents[3] && minY <= extents[4] && minZ <= extents[5] && maxX >= extents[0] && maxY >= extents[1] && maxZ >= extents[2]) {
                            nodeIndex += 1;
                            if (node.externalNode) {
                                overlappingPairs[storageIndex] = currentExternalNode;
                                overlappingPairs[storageIndex + 1] = node.externalNode;
                                storageIndex += 2;
                                numInsertions += 2;
                                if (nodeIndex >= endNodeIndex) {
                                    break;
                                }
                            }
                        } else {
                            nodeIndex += node.escapeNodeOffset;
                            if (nodeIndex >= endNodeIndex) {
                                break;
                            }
                        }
                    }
                } else {
                    break;
                }
            }
            return numInsertions;
        } else {
            return 0;
        }
    };

    AABBTree.prototype.getExtents = function () {
        return (0 < this.nodes.length ? this.nodes[0].extents : null);
    };

    AABBTree.prototype.getRootNode = function () {
        return this.nodes[0];
    };

    AABBTree.prototype.getNodes = function () {
        return this.nodes;
    };

    AABBTree.prototype.getEndNodeIndex = function () {
        return this.endNode;
    };

    AABBTree.prototype.clear = function () {
        if (this.nodes.length) {
            AABBTree.recycleNodes(this.nodes, 0);
        }
        this.endNode = 0;
        this.needsRebuild = false;
        this.needsRebound = false;
        this.numAdds = 0;
        this.numUpdates = 0;
        this.numExternalNodes = 0;
        this.startUpdate = 0x7FFFFFFF;
        this.endUpdate = -0x7FFFFFFF;
        this.ignoreY = false;
    };

    AABBTree.rayTest = function (trees, ray, callback) {
        // convert ray to parametric form
        var origin = ray.origin;
        var direction = ray.direction;

        // values used throughout calculations.
        var o0 = origin[0];
        var o1 = origin[1];
        var o2 = origin[2];
        var d0 = direction[0];
        var d1 = direction[1];
        var d2 = direction[2];
        var id0 = 1 / d0;
        var id1 = 1 / d1;
        var id2 = 1 / d2;

        // evaluate distance factor to a node's extents from ray origin, along direction
        // use this to induce an ordering on which nodes to check.
        function distanceExtents(extents, upperBound) {
            var min0 = extents[0];
            var min1 = extents[1];
            var min2 = extents[2];
            var max0 = extents[3];
            var max1 = extents[4];
            var max2 = extents[5];

            if (min0 <= o0 && o0 <= max0 && min1 <= o1 && o1 <= max1 && min2 <= o2 && o2 <= max2) {
                return 0.0;
            }

            var tmin, tmax;
            var tymin, tymax;
            var del;
            if (d0 >= 0) {
                // Deal with cases where d0 == 0
                del = (min0 - o0);
                tmin = ((del === 0) ? 0 : (del * id0));
                del = (max0 - o0);
                tmax = ((del === 0) ? 0 : (del * id0));
            } else {
                tmin = ((max0 - o0) * id0);
                tmax = ((min0 - o0) * id0);
            }

            if (d1 >= 0) {
                // Deal with cases where d1 == 0
                del = (min1 - o1);
                tymin = ((del === 0) ? 0 : (del * id1));
                del = (max1 - o1);
                tymax = ((del === 0) ? 0 : (del * id1));
            } else {
                tymin = ((max1 - o1) * id1);
                tymax = ((min1 - o1) * id1);
            }

            if ((tmin > tymax) || (tymin > tmax)) {
                return undefined;
            }

            if (tymin > tmin) {
                tmin = tymin;
            }

            if (tymax < tmax) {
                tmax = tymax;
            }

            var tzmin, tzmax;
            if (d2 >= 0) {
                // Deal with cases where d2 == 0
                del = (min2 - o2);
                tzmin = ((del === 0) ? 0 : (del * id2));
                del = (max2 - o2);
                tzmax = ((del === 0) ? 0 : (del * id2));
            } else {
                tzmin = ((max2 - o2) * id2);
                tzmax = ((min2 - o2) * id2);
            }

            if ((tmin > tzmax) || (tzmin > tmax)) {
                return undefined;
            }

            if (tzmin > tmin) {
                tmin = tzmin;
            }

            if (tzmax < tmax) {
                tmax = tzmax;
            }

            if (tmin < 0) {
                tmin = tmax;
            }

            return (0 <= tmin && tmin < upperBound) ? tmin : undefined;
        }

        // we traverse both trees at once
        // keeping a priority list of nodes to check next.
        // TODO: possibly implement priority list more effeciently?
        //       binary heap probably too much overhead in typical case.
        var priorityList = [];

        //current upperBound on distance to first intersection
        //and current closest object properties
        var minimumResult = null;

        //if node is a leaf, intersect ray with shape
        // otherwise insert node into priority list.
        function processNode(tree, nodeIndex, upperBound) {
            var nodes = tree.getNodes();
            var node = nodes[nodeIndex];
            var distance = distanceExtents(node.extents, upperBound);
            if (distance === undefined) {
                return upperBound;
            }

            if (node.externalNode) {
                var result = callback(tree, node.externalNode, ray, distance, upperBound);
                if (result) {
                    minimumResult = result;
                    upperBound = result.factor;
                }
            } else {
                // TODO: change to binary search?
                var length = priorityList.length;
                var i;
                for (i = 0; i < length; i += 1) {
                    var curObj = priorityList[i];
                    if (distance > curObj.distance) {
                        break;
                    }
                }

                //insert node at index i
                priorityList.splice(i - 1, 0, {
                    tree: tree,
                    nodeIndex: nodeIndex,
                    distance: distance
                });
            }

            return upperBound;
        }

        var upperBound = ray.maxFactor;

        var tree;
        var i;
        for (i = 0; i < trees.length; i += 1) {
            tree = trees[i];
            if (tree.endNode !== 0) {
                upperBound = processNode(tree, 0, upperBound);
            }
        }

        while (priorityList.length !== 0) {
            var nodeObj = priorityList.pop();

            if (nodeObj.distance >= upperBound) {
                continue;
            }

            var nodeIndex = nodeObj.nodeIndex;
            tree = nodeObj.tree;
            var nodes = tree.getNodes();

            var node = nodes[nodeIndex];
            var maxIndex = nodeIndex + node.escapeNodeOffset;

            var childIndex = nodeIndex + 1;
            do {
                upperBound = processNode(tree, childIndex, upperBound);
                childIndex += nodes[childIndex].escapeNodeOffset;
            } while(childIndex < maxIndex);
        }

        return minimumResult;
    };

    AABBTree.create = function (highQuality) {
        return new AABBTree(highQuality ? true : false);
    };
    AABBTree.version = 1;

    AABBTree.useFloat32Array = false;

    AABBTree.nodesPoolAllocationSize = 128;
    AABBTree.nodesPool = [];
    return AABBTree;
})();
;

//
// Detect correct typed arrays
((function () {
    if (typeof Float32Array !== "undefined") {
        var testArray = new Float32Array(4);
        var textDescriptor = Object.prototype.toString.call(testArray);
        if (textDescriptor === '[object Float32Array]') {
            AABBTree.useFloat32Array = true;
        }
    }
})());
