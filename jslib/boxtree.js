// Copyright (c) 2012-2014 Turbulenz Limited
/*global Float32Array: false*/
;

;

;

//
// BoxTreeNode
//
var BoxTreeNode = (function () {
    function BoxTreeNode(extents, escapeNodeOffset, externalNode) {
        this.escapeNodeOffset = escapeNodeOffset;
        this.externalNode = externalNode;
        this.extents = extents;
    }
    BoxTreeNode.prototype.isLeaf = function () {
        return !!this.externalNode;
    };

    BoxTreeNode.prototype.reset = function (minX, minY, maxX, maxY, escapeNodeOffset, externalNode) {
        this.escapeNodeOffset = escapeNodeOffset;
        this.externalNode = externalNode;
        var oldExtents = this.extents;
        oldExtents[0] = minX;
        oldExtents[1] = minY;
        oldExtents[2] = maxX;
        oldExtents[3] = maxY;
    };

    BoxTreeNode.prototype.clear = function () {
        this.escapeNodeOffset = 1;
        this.externalNode = undefined;
        var oldExtents = this.extents;
        var maxNumber = Number.MAX_VALUE;
        oldExtents[0] = maxNumber;
        oldExtents[1] = maxNumber;
        oldExtents[2] = -maxNumber;
        oldExtents[3] = -maxNumber;
    };

    BoxTreeNode.create = // Constructor function
    function (extents, escapeNodeOffset, externalNode) {
        return new BoxTreeNode(extents, escapeNodeOffset, externalNode);
    };
    BoxTreeNode.version = 1;
    return BoxTreeNode;
})();

//
// BoxTree
//
var BoxTree = (function () {
    function BoxTree(highQuality) {
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
    }
    BoxTree.prototype.add = function (externalNode, extents) {
        var endNode = this.endNode;
        externalNode.boxTreeIndex = endNode;
        var copyExtents = new this.arrayConstructor(4);
        copyExtents[0] = extents[0];
        copyExtents[1] = extents[1];
        copyExtents[2] = extents[2];
        copyExtents[3] = extents[3];
        this.nodes[endNode] = BoxTreeNode.create(copyExtents, 1, externalNode);
        this.endNode = (endNode + 1);
        this.needsRebuild = true;
        this.numAdds += 1;
        this.numExternalNodes += 1;
    };

    BoxTree.prototype.remove = function (externalNode) {
        var index = externalNode.boxTreeIndex;
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

            externalNode.boxTreeIndex = undefined;
        }
    };

    BoxTree.prototype.findParent = function (nodeIndex) {
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

    BoxTree.prototype.update = function (externalNode, extents) {
        var index = externalNode.boxTreeIndex;
        if (index !== undefined) {
            var min0 = extents[0];
            var min1 = extents[1];
            var max0 = extents[2];
            var max1 = extents[3];

            var needsRebuild = this.needsRebuild;
            var needsRebound = this.needsRebound;
            var nodes = this.nodes;
            var node = nodes[index];
            var nodeExtents = node.extents;

            var doUpdate = (needsRebuild || needsRebound || nodeExtents[0] > min0 || nodeExtents[1] > min1 || nodeExtents[2] < max0 || nodeExtents[3] < max1);

            nodeExtents[0] = min0;
            nodeExtents[1] = min1;
            nodeExtents[2] = max0;
            nodeExtents[3] = max1;

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
                            if (parentExtents[0] > min0 || parentExtents[1] > min1 || parentExtents[2] < max0 || parentExtents[3] < max1) {
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

    BoxTree.prototype.needsFinalize = function () {
        return (this.needsRebuild || this.needsRebound);
    };

    BoxTree.prototype.finalize = function () {
        if (this.needsRebuild) {
            this.rebuild();
        } else if (this.needsRebound) {
            this.rebound();
        }
    };

    BoxTree.prototype.rebound = function () {
        var nodes = this.nodes;
        if (nodes.length > 1) {
            var startUpdateNodeIndex = this.startUpdate;
            var endUpdateNodeIndex = this.endUpdate;

            var nodesStack = [];
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
                    var maxX = extents[2];
                    var maxY = extents[3];

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
                        if (maxX < extents[2]) {
                            maxX = extents[2];
                        }
                        if (maxY < extents[3]) {
                            maxY = extents[3];
                        }
                        nodeIndex = (nodeIndex + node.escapeNodeOffset);
                    }

                    extents = topNode.extents;
                    extents[0] = minX;
                    extents[1] = minY;
                    extents[2] = maxX;
                    extents[3] = maxY;

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

    BoxTree.prototype.rebuild = function () {
        if (this.numExternalNodes > 0) {
            var nodes = this.nodes;

            var buildNodes, numBuildNodes, endNodeIndex;

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
                for (var n = 0; n < endNodeIndex; n += 1) {
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

            if (numBuildNodes > 1) {
                if (numBuildNodes > this.numNodesLeaf && this.numAdds > 0) {
                    if (this.highQuality) {
                        this.sortNodesHighQuality(buildNodes);
                    } else {
                        this.sortNodes(buildNodes);
                    }
                }

                this.recursiveBuild(buildNodes, 0, numBuildNodes, 0);

                endNodeIndex = nodes[0].escapeNodeOffset;
                if (nodes.length > endNodeIndex) {
                    nodes.length = endNodeIndex;
                }
                this.endNode = endNodeIndex;
            } else {
                var rootNode = buildNodes[0];
                rootNode.externalNode.boxTreeIndex = 0;
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

    BoxTree.prototype.sortNodes = function (nodes) {
        var numNodesLeaf = this.numNodesLeaf;
        var numNodes = nodes.length;

        var getkeyXfn = function getkeyXfnFn(node) {
            var extents = node.extents;
            return (extents[0] + extents[2]);
        };

        var getkeyYfn = function getkeyYfnFn(node) {
            var extents = node.extents;
            return (extents[1] + extents[3]);
        };

        var getreversekeyXfn = function getreversekeyXfnFn(node) {
            var extents = node.extents;
            return -(extents[0] + extents[2]);
        };

        var getreversekeyYfn = function getreversekeyYfnFn(node) {
            var extents = node.extents;
            return -(extents[1] + extents[3]);
        };

        var nthElement = this.nthElement;
        var reverse = false;
        var axis = 0;

        var sortNodesRecursive = function sortNodesRecursiveFn(nodes, startIndex, endIndex) {
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
        };

        sortNodesRecursive(nodes, 0, numNodes);
    };

    BoxTree.prototype.sortNodesHighQuality = function (nodes) {
        var numNodesLeaf = this.numNodesLeaf;
        var numNodes = nodes.length;

        var getkeyXfn = function getkeyXfnFn(node) {
            var extents = node.extents;
            return (extents[0] + extents[2]);
        };

        var getkeyYfn = function getkeyYfnFn(node) {
            var extents = node.extents;
            return (extents[1] + extents[3]);
        };

        var getkeyXYfn = function getkeyXYfnFn(node) {
            var extents = node.extents;
            return (extents[0] + extents[1] + extents[2] + extents[3]);
        };

        var getkeyYXfn = function getkeyYXfnFn(node) {
            var extents = node.extents;
            return (extents[0] - extents[1] + extents[2] - extents[3]);
        };

        var getreversekeyXfn = function getreversekeyXfnFn(node) {
            var extents = node.extents;
            return -(extents[0] + extents[2]);
        };

        var getreversekeyYfn = function getreversekeyYfnFn(node) {
            var extents = node.extents;
            return -(extents[1] + extents[3]);
        };

        var getreversekeyXYfn = function getreversekeyXYfnFn(node) {
            var extents = node.extents;
            return -(extents[0] + extents[1] + extents[2] + extents[3]);
        };

        var getreversekeyYXfn = function getreversekeyYXfnFn(node) {
            var extents = node.extents;
            return -(extents[0] - extents[1] + extents[2] - extents[3]);
        };

        var nthElement = this.nthElement;
        var calculateSAH = this.calculateSAH;
        var reverse = false;

        var sortNodesHighQualityRecursive = function sortNodesHighQualityRecursiveFn(nodes, startIndex, endIndex) {
            /* tslint:disable:no-bitwise */
            var splitNodeIndex = ((startIndex + endIndex) >> 1);

            /* tslint:enable:no-bitwise */
            nthElement(nodes, startIndex, splitNodeIndex, endIndex, getkeyXfn);
            var sahX = (calculateSAH(nodes, startIndex, splitNodeIndex) + calculateSAH(nodes, splitNodeIndex, endIndex));

            nthElement(nodes, startIndex, splitNodeIndex, endIndex, getkeyYfn);
            var sahY = (calculateSAH(nodes, startIndex, splitNodeIndex) + calculateSAH(nodes, splitNodeIndex, endIndex));

            nthElement(nodes, startIndex, splitNodeIndex, endIndex, getkeyXYfn);
            var sahXY = (calculateSAH(nodes, startIndex, splitNodeIndex) + calculateSAH(nodes, splitNodeIndex, endIndex));

            nthElement(nodes, startIndex, splitNodeIndex, endIndex, getkeyYXfn);
            var sahYX = (calculateSAH(nodes, startIndex, splitNodeIndex) + calculateSAH(nodes, splitNodeIndex, endIndex));

            if (sahX <= sahY && sahX <= sahXY && sahX <= sahYX) {
                if (reverse) {
                    nthElement(nodes, startIndex, splitNodeIndex, endIndex, getreversekeyXfn);
                } else {
                    nthElement(nodes, startIndex, splitNodeIndex, endIndex, getkeyXfn);
                }
            } else if (sahY <= sahXY && sahY <= sahYX) {
                if (reverse) {
                    nthElement(nodes, startIndex, splitNodeIndex, endIndex, getreversekeyYfn);
                } else {
                    nthElement(nodes, startIndex, splitNodeIndex, endIndex, getkeyYfn);
                }
            } else if (sahXY <= sahYX) {
                if (reverse) {
                    nthElement(nodes, startIndex, splitNodeIndex, endIndex, getreversekeyXYfn);
                } else {
                    nthElement(nodes, startIndex, splitNodeIndex, endIndex, getkeyXYfn);
                }
            } else {
                if (reverse) {
                    nthElement(nodes, startIndex, splitNodeIndex, endIndex, getreversekeyYXfn);
                } else {
                    nthElement(nodes, startIndex, splitNodeIndex, endIndex, getkeyYXfn);
                }
            }

            reverse = !reverse;

            if ((startIndex + numNodesLeaf) < splitNodeIndex) {
                sortNodesHighQualityRecursive(nodes, startIndex, splitNodeIndex);
            }

            if ((splitNodeIndex + numNodesLeaf) < endIndex) {
                sortNodesHighQualityRecursive(nodes, splitNodeIndex, endIndex);
            }
        };

        sortNodesHighQualityRecursive(nodes, 0, numNodes);
    };

    BoxTree.prototype.calculateSAH = function (buildNodes, startIndex, endIndex) {
        var buildNode, extents, minX, minY, maxX, maxY;

        buildNode = buildNodes[startIndex];
        extents = buildNode.extents;
        minX = extents[0];
        minY = extents[1];
        maxX = extents[2];
        maxY = extents[3];

        for (var n = (startIndex + 1); n < endIndex; n += 1) {
            buildNode = buildNodes[n];
            extents = buildNode.extents;
            if (minX > extents[0]) {
                minX = extents[0];
            }
            if (minY > extents[1]) {
                minY = extents[1];
            }
            if (maxX < extents[2]) {
                maxX = extents[2];
            }
            if (maxY < extents[3]) {
                maxY = extents[3];
            }
        }

        return ((maxX - minX) + (maxY - minY));
    };

    BoxTree.prototype.nthElement = function (nodes, first, nth, last, getkey) {
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

    BoxTree.prototype.recursiveBuild = function (buildNodes, startIndex, endIndex, lastNodeIndex) {
        var nodes = this.nodes;
        var nodeIndex = lastNodeIndex;
        lastNodeIndex += 1;

        var minX, minY, maxX, maxY, extents;
        var buildNode, lastNode;

        if ((startIndex + this.numNodesLeaf) >= endIndex) {
            buildNode = buildNodes[startIndex];
            extents = buildNode.extents;
            minX = extents[0];
            minY = extents[1];
            maxX = extents[2];
            maxY = extents[3];

            buildNode.externalNode.boxTreeIndex = lastNodeIndex;
            nodes[lastNodeIndex] = buildNode;

            for (var n = (startIndex + 1); n < endIndex; n += 1) {
                buildNode = buildNodes[n];
                extents = buildNode.extents;
                if (minX > extents[0]) {
                    minX = extents[0];
                }
                if (minY > extents[1]) {
                    minY = extents[1];
                }
                if (maxX < extents[2]) {
                    maxX = extents[2];
                }
                if (maxY < extents[3]) {
                    maxY = extents[3];
                }
                lastNodeIndex += 1;
                buildNode.externalNode.boxTreeIndex = lastNodeIndex;
                nodes[lastNodeIndex] = buildNode;
            }

            lastNode = nodes[lastNodeIndex];
        } else {
            /* tslint:disable:no-bitwise */
            var splitPosIndex = ((startIndex + endIndex) >> 1);

            if ((startIndex + 1) >= splitPosIndex) {
                buildNode = buildNodes[startIndex];
                buildNode.externalNode.boxTreeIndex = lastNodeIndex;
                nodes[lastNodeIndex] = buildNode;
            } else {
                this.recursiveBuild(buildNodes, startIndex, splitPosIndex, lastNodeIndex);
            }

            lastNode = nodes[lastNodeIndex];
            extents = lastNode.extents;
            minX = extents[0];
            minY = extents[1];
            maxX = extents[2];
            maxY = extents[3];

            lastNodeIndex = (lastNodeIndex + lastNode.escapeNodeOffset);

            if ((splitPosIndex + 1) >= endIndex) {
                buildNode = buildNodes[splitPosIndex];
                buildNode.externalNode.boxTreeIndex = lastNodeIndex;
                nodes[lastNodeIndex] = buildNode;
            } else {
                this.recursiveBuild(buildNodes, splitPosIndex, endIndex, lastNodeIndex);
            }

            lastNode = nodes[lastNodeIndex];
            extents = lastNode.extents;
            if (minX > extents[0]) {
                minX = extents[0];
            }
            if (minY > extents[1]) {
                minY = extents[1];
            }
            if (maxX < extents[2]) {
                maxX = extents[2];
            }
            if (maxY < extents[3]) {
                maxY = extents[3];
            }
        }

        var node = nodes[nodeIndex];
        if (node !== undefined) {
            node.reset(minX, minY, maxX, maxY, (lastNodeIndex + lastNode.escapeNodeOffset - nodeIndex));
        } else {
            var parentExtents = new this.arrayConstructor(4);
            parentExtents[0] = minX;
            parentExtents[1] = minY;
            parentExtents[2] = maxX;
            parentExtents[3] = maxY;

            nodes[nodeIndex] = BoxTreeNode.create(parentExtents, (lastNodeIndex + lastNode.escapeNodeOffset - nodeIndex));
        }
    };

    BoxTree.prototype.getVisibleNodes = function (planes, visibleNodes) {
        if (this.numExternalNodes > 0) {
            var nodes = this.nodes;
            var endNodeIndex = this.endNode;
            var numPlanes = planes.length;
            var numVisibleNodes = visibleNodes.length;
            var node, extents, endChildren;
            var n0, n1, p0, p1;
            var isInside, n, plane, d0, d1;
            var nodeIndex = 0;

            for (; ;) {
                node = nodes[nodeIndex];
                extents = node.extents;
                n0 = extents[0];
                n1 = extents[1];
                p0 = extents[2];
                p1 = extents[3];

                //isInsidePlanesBox
                isInside = true;
                n = 0;
                do {
                    plane = planes[n];
                    d0 = plane[0];
                    d1 = plane[1];
                    if ((d0 * (d0 < 0 ? n0 : p0) + d1 * (d1 < 0 ? n1 : p1)) < plane[2]) {
                        isInside = false;
                        break;
                    }
                    n += 1;
                } while(n < numPlanes);
                if (isInside) {
                    if (node.externalNode) {
                        visibleNodes[numVisibleNodes] = node.externalNode;
                        numVisibleNodes += 1;
                        nodeIndex += 1;
                        if (nodeIndex >= endNodeIndex) {
                            break;
                        }
                    } else {
                        //isFullyInsidePlanesBox
                        isInside = true;
                        n = 0;
                        do {
                            plane = planes[n];
                            d0 = plane[0];
                            d1 = plane[1];
                            if ((d0 * (d0 > 0 ? n0 : p0) + d1 * (d1 > 0 ? n1 : p1)) < plane[2]) {
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
                                    visibleNodes[numVisibleNodes] = node.externalNode;
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
    };

    BoxTree.prototype.getOverlappingNodes = function (queryExtents, overlappingNodes, startIndex) {
        if (this.numExternalNodes > 0) {
            var queryMinX = queryExtents[0];
            var queryMinY = queryExtents[1];
            var queryMaxX = queryExtents[2];
            var queryMaxY = queryExtents[3];
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
                var maxX = extents[2];
                var maxY = extents[3];
                if (queryMinX <= maxX && queryMinY <= maxY && queryMaxX >= minX && queryMaxY >= minY) {
                    if (node.externalNode) {
                        overlappingNodes[storageIndex] = node.externalNode;
                        storageIndex += 1;
                        numOverlappingNodes += 1;
                        nodeIndex += 1;
                        if (nodeIndex >= endNodeIndex) {
                            break;
                        }
                    } else {
                        if (queryMaxX >= maxX && queryMaxY >= maxY && queryMinX <= minX && queryMinY <= minY) {
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

    BoxTree.prototype.getCircleOverlappingNodes = function (center, radius, overlappingNodes) {
        if (this.numExternalNodes > 0) {
            var radiusSquared = (radius * radius);
            var centerX = center[0];
            var centerY = center[1];
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
                var maxX = extents[2];
                var maxY = extents[3];
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

    BoxTree.prototype.getOverlappingPairs = function (overlappingPairs, startIndex) {
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
                    var maxX = extents[2];
                    var maxY = extents[3];

                    nodeIndex = currentNodeIndex;
                    for (; ;) {
                        node = nodes[nodeIndex];
                        extents = node.extents;
                        if (minX <= extents[2] && minY <= extents[3] && maxX >= extents[0] && maxY >= extents[1]) {
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

    BoxTree.prototype.getRootNode = function () {
        return this.nodes[0];
    };

    BoxTree.prototype.getNodes = function () {
        return this.nodes;
    };

    BoxTree.prototype.getEndNodeIndex = function () {
        return this.endNode;
    };

    BoxTree.prototype.clear = function () {
        this.nodes = [];
        this.endNode = 0;
        this.needsRebuild = false;
        this.needsRebound = false;
        this.numAdds = 0;
        this.numUpdates = 0;
        this.numExternalNodes = 0;
        this.startUpdate = 0x7FFFFFFF;
        this.endUpdate = -0x7FFFFFFF;
    };

    BoxTree.rayTest = function (trees, ray, callback) {
        // convert ray to parametric form
        var origin = ray.origin;
        var direction = ray.direction;

        // values used throughout calculations.
        var o0 = origin[0];
        var o1 = origin[1];
        var d0 = direction[0];
        var d1 = direction[1];
        var id0 = 1 / d0;
        var id1 = 1 / d1;

        // evaluate distance factor to a node's extents from ray origin, along direction
        // use this to induce an ordering on which nodes to check.
        var distanceExtents = function distanceExtentsFn(extents, upperBound) {
            var min0 = extents[0];
            var min1 = extents[1];
            var max0 = extents[2];
            var max1 = extents[3];

            if (min0 <= o0 && o0 <= max0 && min1 <= o1 && o1 <= max1) {
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

            if (tmin < 0) {
                tmin = tmax;
            }

            return (0 <= tmin && tmin < upperBound) ? tmin : undefined;
        };

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
        var processNode = function processNodeFn(tree, nodeIndex, upperBound) {
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
        };

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

    BoxTree.create = // Constructor function
    function (highQuality) {
        return new BoxTree(highQuality);
    };
    BoxTree.version = 1;
    return BoxTree;
})();

// Detect correct typed arrays
((function () {
    BoxTree.prototype.arrayConstructor = Array;
    if (typeof Float32Array !== "undefined") {
        var testArray = new Float32Array(4);
        var textDescriptor = Object.prototype.toString.call(testArray);
        if (textDescriptor === '[object Float32Array]') {
            BoxTree.prototype.arrayConstructor = Float32Array;
        }
    }
})());
