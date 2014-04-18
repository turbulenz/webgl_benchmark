// Copyright (c) 2011-2012 Turbulenz Limited
/*global TurbulenzEngine*/
/*global Uint8Array*/
/*global Uint16Array*/
/*global window*/
"use strict";
//
// TGALoader
//
var TGALoader = (function () {
    function TGALoader() {
    }
    TGALoader.prototype.processBytes = function (bytes) {
        var header = this.parseHeader(bytes);
        if (!this.isValidHeader(header)) {
            return;
        }

        var offset = 18;

        this.width = header.width;
        this.height = header.height;

        this.bytesPerPixel = Math.floor(header.bpp / 8);

        /*jshint bitwise: false*/
        this.horzRev = (header.descriptor & this.DESC_HORIZONTAL);
        this.vertRev = !(header.descriptor & this.DESC_VERTICAL);

        /*jshint bitwise: true*/
        var rle = false;

        var gd = this.gd;
        switch (header.imageType) {
            case this.TYPE_MAPPED_RLE:
                rle = true;
                if (header.colorMapSize > 24) {
                    this.format = gd.PIXELFORMAT_R8G8B8A8;
                } else if (header.colorMapSize > 16) {
                    this.format = gd.PIXELFORMAT_R8G8B8;
                } else {
                    this.format = gd.PIXELFORMAT_R5G5B5A1;
                }
                break;

            case this.TYPE_MAPPED:
                if (header.colorMapSize > 24) {
                    this.format = gd.PIXELFORMAT_R8G8B8A8;
                } else if (header.colorMapSize > 16) {
                    this.format = gd.PIXELFORMAT_R8G8B8;
                } else {
                    this.format = gd.PIXELFORMAT_R5G5B5A1;
                }
                break;

            case this.TYPE_GRAY_RLE:
                rle = true;
                this.format = gd.PIXELFORMAT_L8;
                break;

            case this.TYPE_GRAY:
                this.format = gd.PIXELFORMAT_L8;
                break;

            case this.TYPE_COLOR_RLE:
                rle = true;
                switch (this.bytesPerPixel) {
                    case 4:
                        this.format = gd.PIXELFORMAT_R8G8B8A8;
                        break;

                    case 3:
                        this.format = gd.PIXELFORMAT_R8G8B8;
                        break;

                    case 2:
                        this.format = gd.PIXELFORMAT_R5G5B5A1;
                        break;

                    default:
                        return;
                }
                break;

            case this.TYPE_COLOR:
                switch (this.bytesPerPixel) {
                    case 4:
                        this.format = gd.PIXELFORMAT_R8G8B8A8;
                        break;

                    case 3:
                        this.format = gd.PIXELFORMAT_R8G8B8;
                        break;

                    case 2:
                        this.format = gd.PIXELFORMAT_R5G5B5A1;
                        break;

                    default:
                        return;
                }
                break;

            default:
                return;
        }

        if (header.idLength) {
            offset += header.idLength;
            if (offset > bytes.length) {
                return;
            }
        }

        if (this.TYPE_MAPPED_RLE === header.imageType || this.TYPE_MAPPED === header.imageType) {
            if (header.colorMapType !== 1) {
                return;
            }
        } else if (header.colorMapType !== 0) {
            return;
        }

        if (header.colorMapType === 1) {
            var index = header.colorMapIndex;
            var length = header.colorMapLength;

            if (length === 0) {
                return;
            }

            var pelbytes = Math.floor(header.colorMapSize / 8);
            var numColors = (length + index);
            var colorMap = [];
            colorMap.length = (numColors * pelbytes);

            this.colorMap = colorMap;
            this.colorMapBytesPerPixel = pelbytes;

            // Zero the entries up to the beginning of the map
            var j;
            for (j = 0; j < (index * pelbytes); j += 1) {
                colorMap[j] = 0;
            }

            for (j = (index * pelbytes); j < (index * pelbytes); j += 1, offset += 1) {
                colorMap[j] = bytes[offset];
            }

            offset += (length * pelbytes);
            if (offset > bytes.length) {
                return;
            }

            if (pelbytes >= 3) {
                for (j = (index * pelbytes); j < (length * pelbytes); j += pelbytes) {
                    var tmp = colorMap[j];
                    colorMap[j] = colorMap[j + 2];
                    colorMap[j + 2] = tmp;
                }
            }
        }

        var data = bytes.subarray(offset);
        bytes = null;

        if (rle) {
            data = this.expandRLE(data);
        }

        var size = (this.width * this.height * this.bytesPerPixel);
        if (data.length < size) {
            return;
        }

        if (this.horzRev) {
            this.flipHorz(data);
        }

        if (this.vertRev) {
            this.flipVert(data);
        }

        if (this.colorMap) {
            data = this.expandColorMap(data);
        } else if (2 < this.bytesPerPixel) {
            this.convertBGR2RGB(data);
        } else if (2 === this.bytesPerPixel) {
            data = this.convertARGB2RGBA(data);
        }

        this.data = data;
    };

    TGALoader.prototype.parseHeader = function (bytes) {
        /*jshint bitwise: false*/
        var header = {
            idLength: bytes[0],
            colorMapType: bytes[1],
            imageType: bytes[2],
            colorMapIndex: ((bytes[4] << 8) | bytes[3]),
            colorMapLength: ((bytes[6] << 8) | bytes[5]),
            colorMapSize: bytes[7],
            xOrigin: ((bytes[9] << 8) | bytes[8]),
            yOrigin: ((bytes[11] << 8) | bytes[10]),
            width: ((bytes[13] << 8) | bytes[12]),
            height: ((bytes[15] << 8) | bytes[14]),
            bpp: bytes[16],
            // Image descriptor:
            // 3-0: attribute bpp
            // 4:   left-to-right
            // 5:   top-to-bottom
            // 7-6: zero
            descriptor: bytes[17]
        };

        /*jshint bitwise: true*/
        return header;
    };

    TGALoader.prototype.isValidHeader = function (header) {
        if (this.TYPE_MAPPED_RLE === header.imageType || this.TYPE_MAPPED === header.imageType) {
            if (header.colorMapType !== 1) {
                return false;
            }
        } else if (header.colorMapType !== 0) {
            return false;
        }

        if (header.colorMapType === 1) {
            if (header.colorMapLength === 0) {
                return false;
            }
        }

        switch (header.imageType) {
            case this.TYPE_MAPPED_RLE:
            case this.TYPE_MAPPED:
                break;

            case this.TYPE_GRAY_RLE:
            case this.TYPE_GRAY:
                break;

            case this.TYPE_COLOR_RLE:
            case this.TYPE_COLOR:
                switch (Math.floor(header.bpp / 8)) {
                    case 4:
                    case 3:
                    case 2:
                        break;

                    default:
                        return false;
                }
                break;

            default:
                return false;
        }

        if (16384 < header.width) {
            return false;
        }

        if (16384 < header.height) {
            return false;
        }

        return true;
    };

    TGALoader.prototype.expandRLE = function (data) {
        var pelbytes = this.bytesPerPixel;
        var width = this.width;
        var height = this.height;
        var datasize = pelbytes;
        var size = (width * height * pelbytes);
        var RLE_PACKETSIZE = this.RLE_PACKETSIZE;
        var dst = new Uint8Array(size);
        var src = 0, dest = 0, n, k;
        do {
            var count = data[src];
            src += 1;

            /*jshint bitwise: false*/
            var bytes = (((count & ~RLE_PACKETSIZE) + 1) * datasize);

            if (count & RLE_PACKETSIZE) {
                if (datasize === 1) {
                    var r = data[src];
                    src += 1;

                    for (n = 0; n < bytes; n += 1) {
                        dst[dest + k] = r;
                    }
                } else {
                    for (n = 0; n < datasize; n += 1) {
                        dst[dest + n] = data[src + n];
                    }
                    src += datasize;

                    for (k = datasize; k < bytes; k += datasize) {
                        for (n = 0; n < datasize; n += 1) {
                            dst[dest + k + n] = dst[dest + n];
                        }
                    }
                }
            } else {
                for (n = 0; n < bytes; n += 1) {
                    dst[dest + n] = data[src + n];
                }
                src += bytes;
            }

            /*jshint bitwise: true*/
            dest += bytes;
        } while(dest < size);

        return dst;
    };

    TGALoader.prototype.expandColorMap = function (data) {
        // Unpack image
        var pelbytes = this.bytesPerPixel;
        var width = this.width;
        var height = this.height;
        var size = (width * height * pelbytes);
        var dst = new Uint8Array(size);
        var dest = 0, src = 0;
        var palette = this.colorMap;
        delete this.colorMap;

        if (pelbytes === 2 || pelbytes === 3 || pelbytes === 4) {
            do {
                var index = (data[src] * pelbytes);
                src += 1;

                for (var n = 0; n < pelbytes; n += 1) {
                    dst[dest] = palette[index + n];
                    dest += 1;
                }
            } while(dest < size);
        }

        if (pelbytes === 2) {
            dst = this.convertARGB2RGBA(dst);
        }

        return dst;
    };

    TGALoader.prototype.flipHorz = function (data) {
        var pelbytes = this.bytesPerPixel;
        var width = this.width;
        var height = this.height;
        var halfWidth = Math.floor(width / 2);
        var pitch = (width * pelbytes);
        for (var i = 0; i < height; i += 1) {
            for (var j = 0; j < halfWidth; j += 1) {
                for (var k = 0; k < pelbytes; k += 1) {
                    var tmp = data[j * pelbytes + k];
                    data[j * pelbytes + k] = data[(width - j - 1) * pelbytes + k];
                    data[(width - j - 1) * pelbytes + k] = tmp;
                }
            }
            data += pitch;
        }
    };

    TGALoader.prototype.flipVert = function (data) {
        var pelbytes = this.bytesPerPixel;
        var width = this.width;
        var height = this.height;
        var halfHeight = Math.floor(height / 2);
        var pitch = (width * pelbytes);
        for (var i = 0; i < halfHeight; i += 1) {
            var srcRow = (i * pitch);
            var destRow = ((height - i - 1) * pitch);
            for (var j = 0; j < pitch; j += 1) {
                var tmp = data[srcRow + j];
                data[srcRow + j] = data[destRow + j];
                data[destRow + j] = tmp;
            }
        }
    };

    TGALoader.prototype.convertBGR2RGB = function (data) {
        // Rearrange the colors from BGR to RGB
        var bytesPerPixel = this.bytesPerPixel;
        var width = this.width;
        var height = this.height;
        var size = (width * height * bytesPerPixel);
        var offset = 0;
        do {
            var tmp = data[offset];
            data[offset] = data[offset + 2];
            data[offset + 2] = tmp;
            offset += bytesPerPixel;
        } while(offset < size);
    };

    TGALoader.prototype.convertARGB2RGBA = function (data) {
        // Rearrange the colors from ARGB to RGBA (2 bytes)
        var bytesPerPixel = this.bytesPerPixel;
        if (bytesPerPixel === 2) {
            var width = this.width;
            var height = this.height;
            var size = (width * height * bytesPerPixel);
            var dst = new Uint16Array(width * height);
            var src = 0, dest = 0;
            var r, g, b, a;

            /*jshint bitwise: false*/
            var mask = ((1 << 5) - 1);
            var blueMask = mask;
            var greenMask = (mask << 5);
            var redMask = (mask << 10);

            do {
                var value = ((src[1] << 8) | src[0]);
                src += 2;
                b = (value & blueMask) << 1;
                g = (value & greenMask) << 1;
                r = (value & redMask) << 1;
                a = (value >> 15);
                dst[dest] = r | g | b | a;
                dest += 1;
            } while(src < size);

            /*jshint bitwise: true*/
            return dst;
        } else {
            return data;
        }
    };

    TGALoader.create = function (params) {
        var loader = new TGALoader();
        loader.gd = params.gd;
        loader.onload = params.onload;
        loader.onerror = params.onerror;

        var src = params.src;
        if (src) {
            loader.src = src;
            var xhr;
            if (window.XMLHttpRequest) {
                xhr = new window.XMLHttpRequest();
            } else if (window.ActiveXObject) {
                xhr = new window.ActiveXObject("Microsoft.XMLHTTP");
            } else {
                if (params.onerror) {
                    params.onerror(0);
                }
                return null;
            }

            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if (!TurbulenzEngine || !TurbulenzEngine.isUnloading()) {
                        var xhrStatus = xhr.status;
                        var xhrStatusText = xhr.status !== 0 && xhr.statusText || 'No connection';

                        if (xhrStatus === 0 && (window.location.protocol === "file:" || window.location.protocol === "chrome-extension:")) {
                            xhrStatus = 200;
                        }

                        if (xhr.getAllResponseHeaders() === "") {
                            var noBody;
                            if (xhr.responseType === "arraybuffer") {
                                noBody = !xhr.response;
                            } else if (xhr.mozResponseArrayBuffer) {
                                noBody = !xhr.mozResponseArrayBuffer;
                            } else {
                                noBody = !xhr.responseText;
                            }
                            if (noBody) {
                                if (loader.onerror) {
                                    loader.onerror(0);
                                }

                                // break circular reference
                                xhr.onreadystatechange = null;
                                xhr = null;
                                return;
                            }
                        }

                        if (xhrStatus === 200 || xhrStatus === 0) {
                            var buffer;
                            if (xhr.responseType === "arraybuffer") {
                                buffer = xhr.response;
                            } else if (xhr.mozResponseArrayBuffer) {
                                buffer = xhr.mozResponseArrayBuffer;
                            } else {
                                /*jshint bitwise: false*/
                                var text = xhr.responseText;
                                var numChars = text.length;
                                buffer = [];
                                buffer.length = numChars;
                                for (var i = 0; i < numChars; i += 1) {
                                    buffer[i] = (text.charCodeAt(i) & 0xff);
                                }
                                /*jshint bitwise: true*/
                            }

                            loader.processBytes(new Uint8Array(buffer));
                            if (loader.data) {
                                if (loader.onload) {
                                    loader.onload(loader.data, loader.width, loader.height, loader.format, xhrStatus);
                                }
                            } else {
                                if (loader.onerror) {
                                    loader.onerror(xhrStatus);
                                }
                            }
                        } else {
                            if (loader.onerror) {
                                loader.onerror(xhrStatus);
                            }
                        }
                    }

                    // break circular reference
                    xhr.onreadystatechange = null;
                    xhr = null;
                }
            };
            xhr.open("GET", params.src, true);
            if (typeof xhr.responseType === "string" || (xhr.hasOwnProperty && xhr.hasOwnProperty("responseType"))) {
                xhr.responseType = "arraybuffer";
            } else if (xhr.overrideMimeType) {
                xhr.overrideMimeType("text/plain; charset=x-user-defined");
            } else {
                xhr.setRequestHeader("Content-Type", "text/plain; charset=x-user-defined");
            }
            xhr.send(null);
        } else {
            loader.processBytes(params.data);
            if (loader.data) {
                if (loader.onload) {
                    loader.onload(loader.data, loader.width, loader.height, loader.format, 200);
                }
            } else {
                if (loader.onerror) {
                    loader.onerror(0);
                }
            }
        }

        return loader;
    };
    TGALoader.version = 1;
    return TGALoader;
})();

TGALoader.prototype.TYPE_MAPPED = 1;
TGALoader.prototype.TYPE_COLOR = 2;
TGALoader.prototype.TYPE_GRAY = 3;
TGALoader.prototype.TYPE_MAPPED_RLE = 9;
TGALoader.prototype.TYPE_COLOR_RLE = 10;
TGALoader.prototype.TYPE_GRAY_RLE = 11;
TGALoader.prototype.DESC_ABITS = 0x0f;
TGALoader.prototype.DESC_HORIZONTAL = 0x10;
TGALoader.prototype.DESC_VERTICAL = 0x20;
TGALoader.prototype.SIGNATURE = "TRUEVISION-XFILE";
TGALoader.prototype.RLE_PACKETSIZE = 0x80;
