var Module = typeof Module !== "undefined" ? Module : {};
var moduleOverrides = {};
var key;
for (key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}
var arguments_ = [];
var thisProgram = "./this.program";
var quit_ = function (status, toThrow) {
  throw toThrow;
};
var ENVIRONMENT_IS_WEB = false;
var ENVIRONMENT_IS_WORKER = false;
var ENVIRONMENT_IS_NODE = false;
var ENVIRONMENT_IS_SHELL = false;
ENVIRONMENT_IS_WEB = typeof window === "object";
ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
ENVIRONMENT_IS_NODE =
  typeof process === "object" &&
  typeof process.versions === "object" &&
  typeof process.versions.node === "string";
ENVIRONMENT_IS_SHELL =
  !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
var scriptDirectory = "";
function locateFile(path) {
  if (Module["locateFile"]) {
    return Module["locateFile"](path, scriptDirectory);
  }
  return scriptDirectory + path;
}
var read_, readAsync, readBinary, setWindowTitle;
var nodeFS;
var nodePath;
if (ENVIRONMENT_IS_NODE) {
  if (ENVIRONMENT_IS_WORKER) {
    scriptDirectory = require("path").dirname(scriptDirectory) + "/";
  } else {
    scriptDirectory = __dirname + "/";
  }
  read_ = function shell_read(filename, binary) {
    if (!nodeFS) nodeFS = require("fs");
    if (!nodePath) nodePath = require("path");
    filename = nodePath["normalize"](filename);
    return nodeFS["readFileSync"](filename, binary ? null : "utf8");
  };
  readBinary = function readBinary(filename) {
    var ret = read_(filename, true);
    if (!ret.buffer) {
      ret = new Uint8Array(ret);
    }
    assert(ret.buffer);
    return ret;
  };
  if (process["argv"].length > 1) {
    thisProgram = process["argv"][1].replace(/\\/g, "/");
  }
  arguments_ = process["argv"].slice(2);
  if (typeof module !== "undefined") {
    module["exports"] = Module;
  }
  process["on"]("uncaughtException", function (ex) {
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });
  process["on"]("unhandledRejection", abort);
  quit_ = function (status) {
    process["exit"](status);
  };
  Module["inspect"] = function () {
    return "[Emscripten Module object]";
  };
} else if (ENVIRONMENT_IS_SHELL) {
  if (typeof read != "undefined") {
    read_ = function shell_read(f) {
      return read(f);
    };
  }
  readBinary = function readBinary(f) {
    var data;
    if (typeof readbuffer === "function") {
      return new Uint8Array(readbuffer(f));
    }
    data = read(f, "binary");
    assert(typeof data === "object");
    return data;
  };
  if (typeof scriptArgs != "undefined") {
    arguments_ = scriptArgs;
  } else if (typeof arguments != "undefined") {
    arguments_ = arguments;
  }
  if (typeof quit === "function") {
    quit_ = function (status) {
      quit(status);
    };
  }
  if (typeof print !== "undefined") {
    if (typeof console === "undefined") console = {};
    console.log = print;
    console.warn = console.error =
      typeof printErr !== "undefined" ? printErr : print;
  }
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  if (ENVIRONMENT_IS_WORKER) {
    scriptDirectory = self.location.href;
  } else if (typeof document !== "undefined" && document.currentScript) {
    scriptDirectory = document.currentScript.src;
  }
  if (scriptDirectory.indexOf("blob:") !== 0) {
    scriptDirectory = scriptDirectory.substr(
      0,
      scriptDirectory.lastIndexOf("/") + 1
    );
  } else {
    scriptDirectory = "";
  }
  {
    read_ = function shell_read(url) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, false);
      xhr.send(null);
      return xhr.responseText;
    };
    if (ENVIRONMENT_IS_WORKER) {
      readBinary = function readBinary(url) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, false);
        xhr.responseType = "arraybuffer";
        xhr.send(null);
        return new Uint8Array(xhr.response);
      };
    }
    readAsync = function readAsync(url, onload, onerror) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.responseType = "arraybuffer";
      xhr.onload = function xhr_onload() {
        if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) {
          onload(xhr.response);
          return;
        }
        onerror();
      };
      xhr.onerror = onerror;
      xhr.send(null);
    };
  }
  setWindowTitle = function (title) {};
} else {
}
var out = Module["print"] || console.log.bind(console);
var err = Module["printErr"] || console.warn.bind(console);
for (key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}
moduleOverrides = null;
if (Module["arguments"]) arguments_ = Module["arguments"];
if (Module["thisProgram"]) thisProgram = Module["thisProgram"];
if (Module["quit"]) quit_ = Module["quit"];
function warnOnce(text) {
  if (!warnOnce.shown) warnOnce.shown = {};
  if (!warnOnce.shown[text]) {
    warnOnce.shown[text] = 1;
    err(text);
  }
}
var wasmBinary;
if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];
var noExitRuntime;
if (Module["noExitRuntime"]) noExitRuntime = Module["noExitRuntime"];
if (typeof WebAssembly !== "object") {
  abort("no native wasm support detected");
}
var wasmMemory;
var ABORT = false;
var EXITSTATUS = 0;
function assert(condition, text) {
  if (!condition) {
    abort("Assertion failed: " + text);
  }
}
var UTF8Decoder =
  typeof TextDecoder !== "undefined" ? new TextDecoder("utf8") : undefined;
function UTF8ArrayToString(heap, idx, maxBytesToRead) {
  var endIdx = idx + maxBytesToRead;
  var endPtr = idx;
  while (heap[endPtr] && !(endPtr >= endIdx)) ++endPtr;
  if (endPtr - idx > 16 && heap.subarray && UTF8Decoder) {
    return UTF8Decoder.decode(heap.subarray(idx, endPtr));
  } else {
    var str = "";
    while (idx < endPtr) {
      var u0 = heap[idx++];
      if (!(u0 & 128)) {
        str += String.fromCharCode(u0);
        continue;
      }
      var u1 = heap[idx++] & 63;
      if ((u0 & 224) == 192) {
        str += String.fromCharCode(((u0 & 31) << 6) | u1);
        continue;
      }
      var u2 = heap[idx++] & 63;
      if ((u0 & 240) == 224) {
        u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
      } else {
        u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heap[idx++] & 63);
      }
      if (u0 < 65536) {
        str += String.fromCharCode(u0);
      } else {
        var ch = u0 - 65536;
        str += String.fromCharCode(55296 | (ch >> 10), 56320 | (ch & 1023));
      }
    }
  }
  return str;
}
function UTF8ToString(ptr, maxBytesToRead) {
  return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
}
function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) return 0;
  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1;
  for (var i = 0; i < str.length; ++i) {
    var u = str.charCodeAt(i);
    if (u >= 55296 && u <= 57343) {
      var u1 = str.charCodeAt(++i);
      u = (65536 + ((u & 1023) << 10)) | (u1 & 1023);
    }
    if (u <= 127) {
      if (outIdx >= endIdx) break;
      heap[outIdx++] = u;
    } else if (u <= 2047) {
      if (outIdx + 1 >= endIdx) break;
      heap[outIdx++] = 192 | (u >> 6);
      heap[outIdx++] = 128 | (u & 63);
    } else if (u <= 65535) {
      if (outIdx + 2 >= endIdx) break;
      heap[outIdx++] = 224 | (u >> 12);
      heap[outIdx++] = 128 | ((u >> 6) & 63);
      heap[outIdx++] = 128 | (u & 63);
    } else {
      if (outIdx + 3 >= endIdx) break;
      heap[outIdx++] = 240 | (u >> 18);
      heap[outIdx++] = 128 | ((u >> 12) & 63);
      heap[outIdx++] = 128 | ((u >> 6) & 63);
      heap[outIdx++] = 128 | (u & 63);
    }
  }
  heap[outIdx] = 0;
  return outIdx - startIdx;
}
function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    var u = str.charCodeAt(i);
    if (u >= 55296 && u <= 57343)
      u = (65536 + ((u & 1023) << 10)) | (str.charCodeAt(++i) & 1023);
    if (u <= 127) ++len;
    else if (u <= 2047) len += 2;
    else if (u <= 65535) len += 3;
    else len += 4;
  }
  return len;
}
function allocateUTF8(str) {
  var size = lengthBytesUTF8(str) + 1;
  var ret = _malloc(size);
  if (ret) stringToUTF8Array(str, HEAP8, ret, size);
  return ret;
}
var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
function updateGlobalBufferAndViews(buf) {
  buffer = buf;
  Module["HEAP8"] = HEAP8 = new Int8Array(buf);
  Module["HEAP16"] = HEAP16 = new Int16Array(buf);
  Module["HEAP32"] = HEAP32 = new Int32Array(buf);
  Module["HEAPU8"] = HEAPU8 = new Uint8Array(buf);
  Module["HEAPU16"] = HEAPU16 = new Uint16Array(buf);
  Module["HEAPU32"] = HEAPU32 = new Uint32Array(buf);
  Module["HEAPF32"] = HEAPF32 = new Float32Array(buf);
  Module["HEAPF64"] = HEAPF64 = new Float64Array(buf);
}
var INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 268435456;
if (Module["wasmMemory"]) {
  wasmMemory = Module["wasmMemory"];
} else {
  wasmMemory = new WebAssembly.Memory({
    initial: INITIAL_MEMORY / 65536,
    maximum: INITIAL_MEMORY / 65536,
  });
}
if (wasmMemory) {
  buffer = wasmMemory.buffer;
}
INITIAL_MEMORY = buffer.byteLength;
updateGlobalBufferAndViews(buffer);
var wasmTable;
var __ATPRERUN__ = [];
var __ATINIT__ = [];
var __ATMAIN__ = [];
var __ATPOSTRUN__ = [];
var runtimeInitialized = false;
var runtimeExited = false;
function preRun() {
  if (Module["preRun"]) {
    if (typeof Module["preRun"] == "function")
      Module["preRun"] = [Module["preRun"]];
    while (Module["preRun"].length) {
      addOnPreRun(Module["preRun"].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}
function initRuntime() {
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}
function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}
function exitRuntime() {
  runtimeExited = true;
}
function postRun() {
  if (Module["postRun"]) {
    if (typeof Module["postRun"] == "function")
      Module["postRun"] = [Module["postRun"]];
    while (Module["postRun"].length) {
      addOnPostRun(Module["postRun"].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}
function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null;
function getUniqueRunDependency(id) {
  return id;
}
function addRunDependency(id) {
  runDependencies++;
  if (Module["monitorRunDependencies"]) {
    Module["monitorRunDependencies"](runDependencies);
  }
}
function removeRunDependency(id) {
  runDependencies--;
  if (Module["monitorRunDependencies"]) {
    Module["monitorRunDependencies"](runDependencies);
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback();
    }
  }
}
Module["preloadedImages"] = {};
Module["preloadedAudios"] = {};
function abort(what) {
  if (Module["onAbort"]) {
    Module["onAbort"](what);
  }
  what += "";
  err(what);
  ABORT = true;
  EXITSTATUS = 1;
  what = "abort(" + what + "). Build with -s ASSERTIONS=1 for more info.";
  var e = new WebAssembly.RuntimeError(what);
  throw e;
}
function hasPrefix(str, prefix) {
  return String.prototype.startsWith
    ? str.startsWith(prefix)
    : str.indexOf(prefix) === 0;
}
var dataURIPrefix = "data:application/octet-stream;base64,";
function isDataURI(filename) {
  return hasPrefix(filename, dataURIPrefix);
}
var fileURIPrefix = "file://";
function isFileURI(filename) {
  return hasPrefix(filename, fileURIPrefix);
}
var wasmBinaryFile = "VirtualXP.wasm";
if (!isDataURI(wasmBinaryFile)) {
  wasmBinaryFile = locateFile(wasmBinaryFile);
}
function getBinary() {
  try {
    if (wasmBinary) {
      return new Uint8Array(wasmBinary);
    }
    if (readBinary) {
      return readBinary(wasmBinaryFile);
    } else {
      throw "both async and sync fetching of the wasm failed";
    }
  } catch (err) {
    abort(err);
  }
}
function getBinaryPromise() {
  if (
    !wasmBinary &&
    (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) &&
    typeof fetch === "function" &&
    !isFileURI(wasmBinaryFile)
  ) {
    return fetch(wasmBinaryFile, { credentials: "same-origin" })
      .then(function (response) {
        if (!response["ok"]) {
          throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
        }
        return response["arrayBuffer"]();
      })
      .catch(function () {
        return getBinary();
      });
  }
  return Promise.resolve().then(getBinary);
}
function createWasm() {
  var info = { a: asmLibraryArg };
  function receiveInstance(instance, module) {
    var exports = instance.exports;
    Module["asm"] = exports;
    wasmTable = Module["asm"]["s"];
    removeRunDependency("wasm-instantiate");
  }
  addRunDependency("wasm-instantiate");
  function receiveInstantiatedSource(output) {
    receiveInstance(output["instance"]);
  }
  function instantiateArrayBuffer(receiver) {
    return getBinaryPromise()
      .then(function (binary) {
        return WebAssembly.instantiate(binary, info);
      })
      .then(receiver, function (reason) {
        err("failed to asynchronously prepare wasm: " + reason);
        abort(reason);
      });
  }
  function instantiateAsync() {
    if (
      !wasmBinary &&
      typeof WebAssembly.instantiateStreaming === "function" &&
      !isDataURI(wasmBinaryFile) &&
      !isFileURI(wasmBinaryFile) &&
      typeof fetch === "function"
    ) {
      return fetch(wasmBinaryFile, { credentials: "same-origin" }).then(
        function (response) {
          var result = WebAssembly.instantiateStreaming(response, info);
          return result.then(receiveInstantiatedSource, function (reason) {
            err("wasm streaming compile failed: " + reason);
            err("falling back to ArrayBuffer instantiation");
            return instantiateArrayBuffer(receiveInstantiatedSource);
          });
        }
      );
    } else {
      return instantiateArrayBuffer(receiveInstantiatedSource);
    }
  }
  if (Module["instantiateWasm"]) {
    try {
      var exports = Module["instantiateWasm"](info, receiveInstance);
      return exports;
    } catch (e) {
      err("Module.instantiateWasm callback failed with error: " + e);
      return false;
    }
  }
  instantiateAsync();
  return {};
}
var tempDouble;
var tempI64;
var ASM_CONSTS = {
  1386: function ($0, $1, $2) {
    window["loadFile"]($0, $1, $2);
  },
  1422: function ($0, $1, $2) {
    window["saveFile"]($0, $1, $2);
  },
  2444: function ($0, $1, $2) {
    window["drives"][$0]["flushReadQueue"]($1, $2);
  },
  2517: function ($0, $1, $2, $3, $4) {
    return window["drives"][$0]["readCache"]($1, $2, $3, $4) | 0;
  },
  2583: function ($0, $1, $2) {
    return window["drives"][$0]["readQueue"]($1, $2);
  },
  2682: function ($0, $1, $2, $3, $4) {
    return window["drives"][$0]["writeCache"]($1, $2, $3, $4);
  },
  2820: function ($0, $1, $2) {
    window["update_size"]($0, $1, $2);
  },
  2859: function () {
    window["update_screen"]();
  },
  3298: function ($0, $1, $2) {
    window["load_file_xhr"]($0, $1, $2);
  },
  3551: function ($0, $1, $2) {
    window["drive_init"]($0, $1, $2);
  },
};
function callRuntimeCallbacks(callbacks) {
  while (callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == "function") {
      callback(Module);
      continue;
    }
    var func = callback.func;
    if (typeof func === "number") {
      if (callback.arg === undefined) {
        wasmTable.get(func)();
      } else {
        wasmTable.get(func)(callback.arg);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}
var PATH = {
  splitPath: function (filename) {
    var splitPathRe =
      /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
    return splitPathRe.exec(filename).slice(1);
  },
  normalizeArray: function (parts, allowAboveRoot) {
    var up = 0;
    for (var i = parts.length - 1; i >= 0; i--) {
      var last = parts[i];
      if (last === ".") {
        parts.splice(i, 1);
      } else if (last === "..") {
        parts.splice(i, 1);
        up++;
      } else if (up) {
        parts.splice(i, 1);
        up--;
      }
    }
    if (allowAboveRoot) {
      for (; up; up--) {
        parts.unshift("..");
      }
    }
    return parts;
  },
  normalize: function (path) {
    var isAbsolute = path.charAt(0) === "/",
      trailingSlash = path.substr(-1) === "/";
    path = PATH.normalizeArray(
      path.split("/").filter(function (p) {
        return !!p;
      }),
      !isAbsolute
    ).join("/");
    if (!path && !isAbsolute) {
      path = ".";
    }
    if (path && trailingSlash) {
      path += "/";
    }
    return (isAbsolute ? "/" : "") + path;
  },
  dirname: function (path) {
    var result = PATH.splitPath(path),
      root = result[0],
      dir = result[1];
    if (!root && !dir) {
      return ".";
    }
    if (dir) {
      dir = dir.substr(0, dir.length - 1);
    }
    return root + dir;
  },
  basename: function (path) {
    if (path === "/") return "/";
    path = PATH.normalize(path);
    path = path.replace(/\/$/, "");
    var lastSlash = path.lastIndexOf("/");
    if (lastSlash === -1) return path;
    return path.substr(lastSlash + 1);
  },
  extname: function (path) {
    return PATH.splitPath(path)[3];
  },
  join: function () {
    var paths = Array.prototype.slice.call(arguments, 0);
    return PATH.normalize(paths.join("/"));
  },
  join2: function (l, r) {
    return PATH.normalize(l + "/" + r);
  },
};
function _emscripten_set_main_loop_timing(mode, value) {
  Browser.mainLoop.timingMode = mode;
  Browser.mainLoop.timingValue = value;
  if (!Browser.mainLoop.func) {
    return 1;
  }
  if (mode == 0) {
    Browser.mainLoop.scheduler =
      function Browser_mainLoop_scheduler_setTimeout() {
        var timeUntilNextTick =
          Math.max(
            0,
            Browser.mainLoop.tickStartTime + value - _emscripten_get_now()
          ) | 0;
        setTimeout(Browser.mainLoop.runner, timeUntilNextTick);
      };
    Browser.mainLoop.method = "timeout";
  } else if (mode == 1) {
    Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_rAF() {
      Browser.requestAnimationFrame(Browser.mainLoop.runner);
    };
    Browser.mainLoop.method = "rAF";
  } else if (mode == 2) {
    if (typeof setImmediate === "undefined") {
      var setImmediates = [];
      var emscriptenMainLoopMessageId = "setimmediate";
      var Browser_setImmediate_messageHandler = function (event) {
        if (
          event.data === emscriptenMainLoopMessageId ||
          event.data.target === emscriptenMainLoopMessageId
        ) {
          event.stopPropagation();
          setImmediates.shift()();
        }
      };
      addEventListener("message", Browser_setImmediate_messageHandler, true);
      setImmediate = function Browser_emulated_setImmediate(func) {
        setImmediates.push(func);
        if (ENVIRONMENT_IS_WORKER) {
          if (Module["setImmediates"] === undefined)
            Module["setImmediates"] = [];
          Module["setImmediates"].push(func);
          postMessage({ target: emscriptenMainLoopMessageId });
        } else postMessage(emscriptenMainLoopMessageId, "*");
      };
    }
    Browser.mainLoop.scheduler =
      function Browser_mainLoop_scheduler_setImmediate() {
        setImmediate(Browser.mainLoop.runner);
      };
    Browser.mainLoop.method = "immediate";
  }
  return 0;
}
function setMainLoop(
  browserIterationFunc,
  fps,
  simulateInfiniteLoop,
  arg,
  noSetTiming
) {
  noExitRuntime = true;
  assert(
    !Browser.mainLoop.func,
    "emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters."
  );
  Browser.mainLoop.func = browserIterationFunc;
  Browser.mainLoop.arg = arg;
  var thisMainLoopId = Browser.mainLoop.currentlyRunningMainloop;
  Browser.mainLoop.runner = function Browser_mainLoop_runner() {
    if (ABORT) return;
    if (Browser.mainLoop.queue.length > 0) {
      var start = Date.now();
      var blocker = Browser.mainLoop.queue.shift();
      blocker.func(blocker.arg);
      if (Browser.mainLoop.remainingBlockers) {
        var remaining = Browser.mainLoop.remainingBlockers;
        var next = remaining % 1 == 0 ? remaining - 1 : Math.floor(remaining);
        if (blocker.counted) {
          Browser.mainLoop.remainingBlockers = next;
        } else {
          next = next + 0.5;
          Browser.mainLoop.remainingBlockers = (8 * remaining + next) / 9;
        }
      }
      console.log(
        'main loop blocker "' +
          blocker.name +
          '" took ' +
          (Date.now() - start) +
          " ms"
      );
      Browser.mainLoop.updateStatus();
      if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
      setTimeout(Browser.mainLoop.runner, 0);
      return;
    }
    if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
    Browser.mainLoop.currentFrameNumber =
      (Browser.mainLoop.currentFrameNumber + 1) | 0;
    if (
      Browser.mainLoop.timingMode == 1 &&
      Browser.mainLoop.timingValue > 1 &&
      Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0
    ) {
      Browser.mainLoop.scheduler();
      return;
    } else if (Browser.mainLoop.timingMode == 0) {
      Browser.mainLoop.tickStartTime = _emscripten_get_now();
    }
    Browser.mainLoop.runIter(browserIterationFunc);
    if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
    if (typeof SDL === "object" && SDL.audio && SDL.audio.queueNewAudioData)
      SDL.audio.queueNewAudioData();
    Browser.mainLoop.scheduler();
  };
  if (!noSetTiming) {
    if (fps && fps > 0) _emscripten_set_main_loop_timing(0, 1e3 / fps);
    else _emscripten_set_main_loop_timing(1, 1);
    Browser.mainLoop.scheduler();
  }
  if (simulateInfiniteLoop) {
    throw "unwind";
  }
}
var Browser = {
  mainLoop: {
    scheduler: null,
    method: "",
    currentlyRunningMainloop: 0,
    func: null,
    arg: 0,
    timingMode: 0,
    timingValue: 0,
    currentFrameNumber: 0,
    queue: [],
    pause: function () {
      Browser.mainLoop.scheduler = null;
      Browser.mainLoop.currentlyRunningMainloop++;
    },
    resume: function () {
      Browser.mainLoop.currentlyRunningMainloop++;
      var timingMode = Browser.mainLoop.timingMode;
      var timingValue = Browser.mainLoop.timingValue;
      var func = Browser.mainLoop.func;
      Browser.mainLoop.func = null;
      setMainLoop(func, 0, false, Browser.mainLoop.arg, true);
      _emscripten_set_main_loop_timing(timingMode, timingValue);
      Browser.mainLoop.scheduler();
    },
    updateStatus: function () {
      if (Module["setStatus"]) {
        var message = Module["statusMessage"] || "Please wait...";
        var remaining = Browser.mainLoop.remainingBlockers;
        var expected = Browser.mainLoop.expectedBlockers;
        if (remaining) {
          if (remaining < expected) {
            Module["setStatus"](
              message + " (" + (expected - remaining) + "/" + expected + ")"
            );
          } else {
            Module["setStatus"](message);
          }
        } else {
          Module["setStatus"]("");
        }
      }
    },
    runIter: function (func) {
      if (ABORT) return;
      if (Module["preMainLoop"]) {
        var preRet = Module["preMainLoop"]();
        if (preRet === false) {
          return;
        }
      }
      try {
        func();
      } catch (e) {
        if (e instanceof ExitStatus) {
          return;
        } else if (e == "unwind") {
          return;
        } else {
          if (e && typeof e === "object" && e.stack)
            err("exception thrown: " + [e, e.stack]);
          throw e;
        }
      }
      if (Module["postMainLoop"]) Module["postMainLoop"]();
    },
  },
  isFullscreen: false,
  pointerLock: false,
  moduleContextCreatedCallbacks: [],
  workers: [],
  init: function () {
    if (!Module["preloadPlugins"]) Module["preloadPlugins"] = [];
    if (Browser.initted) return;
    Browser.initted = true;
    try {
      new Blob();
      Browser.hasBlobConstructor = true;
    } catch (e) {
      Browser.hasBlobConstructor = false;
      console.log(
        "warning: no blob constructor, cannot create blobs with mimetypes"
      );
    }
    Browser.BlobBuilder =
      typeof MozBlobBuilder != "undefined"
        ? MozBlobBuilder
        : typeof WebKitBlobBuilder != "undefined"
        ? WebKitBlobBuilder
        : !Browser.hasBlobConstructor
        ? console.log("warning: no BlobBuilder")
        : null;
    Browser.URLObject =
      typeof window != "undefined"
        ? window.URL
          ? window.URL
          : window.webkitURL
        : undefined;
    if (!Module.noImageDecoding && typeof Browser.URLObject === "undefined") {
      console.log(
        "warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available."
      );
      Module.noImageDecoding = true;
    }
    var imagePlugin = {};
    imagePlugin["canHandle"] = function imagePlugin_canHandle(name) {
      return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
    };
    imagePlugin["handle"] = function imagePlugin_handle(
      byteArray,
      name,
      onload,
      onerror
    ) {
      var b = null;
      if (Browser.hasBlobConstructor) {
        try {
          b = new Blob([byteArray], { type: Browser.getMimetype(name) });
          if (b.size !== byteArray.length) {
            b = new Blob([new Uint8Array(byteArray).buffer], {
              type: Browser.getMimetype(name),
            });
          }
        } catch (e) {
          warnOnce(
            "Blob constructor present but fails: " +
              e +
              "; falling back to blob builder"
          );
        }
      }
      if (!b) {
        var bb = new Browser.BlobBuilder();
        bb.append(new Uint8Array(byteArray).buffer);
        b = bb.getBlob();
      }
      var url = Browser.URLObject.createObjectURL(b);
      var img = new Image();
      img.onload = function img_onload() {
        assert(img.complete, "Image " + name + " could not be decoded");
        var canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        Module["preloadedImages"][name] = canvas;
        Browser.URLObject.revokeObjectURL(url);
        if (onload) onload(byteArray);
      };
      img.onerror = function img_onerror(event) {
        console.log("Image " + url + " could not be decoded");
        if (onerror) onerror();
      };
      img.src = url;
    };
    Module["preloadPlugins"].push(imagePlugin);
    var audioPlugin = {};
    audioPlugin["canHandle"] = function audioPlugin_canHandle(name) {
      return (
        !Module.noAudioDecoding &&
        name.substr(-4) in { ".ogg": 1, ".wav": 1, ".mp3": 1 }
      );
    };
    audioPlugin["handle"] = function audioPlugin_handle(
      byteArray,
      name,
      onload,
      onerror
    ) {
      var done = false;
      function finish(audio) {
        if (done) return;
        done = true;
        Module["preloadedAudios"][name] = audio;
        if (onload) onload(byteArray);
      }
      function fail() {
        if (done) return;
        done = true;
        Module["preloadedAudios"][name] = new Audio();
        if (onerror) onerror();
      }
      if (Browser.hasBlobConstructor) {
        try {
          var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
        } catch (e) {
          return fail();
        }
        var url = Browser.URLObject.createObjectURL(b);
        var audio = new Audio();
        audio.addEventListener(
          "canplaythrough",
          function () {
            finish(audio);
          },
          false
        );
        audio.onerror = function audio_onerror(event) {
          if (done) return;
          console.log(
            "warning: browser could not fully decode audio " +
              name +
              ", trying slower base64 approach"
          );
          function encode64(data) {
            var BASE =
              "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            var PAD = "=";
            var ret = "";
            var leftchar = 0;
            var leftbits = 0;
            for (var i = 0; i < data.length; i++) {
              leftchar = (leftchar << 8) | data[i];
              leftbits += 8;
              while (leftbits >= 6) {
                var curr = (leftchar >> (leftbits - 6)) & 63;
                leftbits -= 6;
                ret += BASE[curr];
              }
            }
            if (leftbits == 2) {
              ret += BASE[(leftchar & 3) << 4];
              ret += PAD + PAD;
            } else if (leftbits == 4) {
              ret += BASE[(leftchar & 15) << 2];
              ret += PAD;
            }
            return ret;
          }
          audio.src =
            "data:audio/x-" +
            name.substr(-3) +
            ";base64," +
            encode64(byteArray);
          finish(audio);
        };
        audio.src = url;
        Browser.safeSetTimeout(function () {
          finish(audio);
        }, 1e4);
      } else {
        return fail();
      }
    };
    Module["preloadPlugins"].push(audioPlugin);
    function pointerLockChange() {
      Browser.pointerLock =
        document["pointerLockElement"] === Module["canvas"] ||
        document["mozPointerLockElement"] === Module["canvas"] ||
        document["webkitPointerLockElement"] === Module["canvas"] ||
        document["msPointerLockElement"] === Module["canvas"];
    }
    var canvas = Module["canvas"];
    if (canvas) {
      canvas.requestPointerLock =
        canvas["requestPointerLock"] ||
        canvas["mozRequestPointerLock"] ||
        canvas["webkitRequestPointerLock"] ||
        canvas["msRequestPointerLock"] ||
        function () {};
      canvas.exitPointerLock =
        document["exitPointerLock"] ||
        document["mozExitPointerLock"] ||
        document["webkitExitPointerLock"] ||
        document["msExitPointerLock"] ||
        function () {};
      canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
      document.addEventListener("pointerlockchange", pointerLockChange, false);
      document.addEventListener(
        "mozpointerlockchange",
        pointerLockChange,
        false
      );
      document.addEventListener(
        "webkitpointerlockchange",
        pointerLockChange,
        false
      );
      document.addEventListener(
        "mspointerlockchange",
        pointerLockChange,
        false
      );
      if (Module["elementPointerLock"]) {
        canvas.addEventListener(
          "click",
          function (ev) {
            if (!Browser.pointerLock && Module["canvas"].requestPointerLock) {
              Module["canvas"].requestPointerLock();
              ev.preventDefault();
            }
          },
          false
        );
      }
    }
  },
  createContext: function (
    canvas,
    useWebGL,
    setInModule,
    webGLContextAttributes
  ) {
    if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx;
    var ctx;
    var contextHandle;
    if (useWebGL) {
      var contextAttributes = {
        antialias: false,
        alpha: false,
        majorVersion: 1,
      };
      if (webGLContextAttributes) {
        for (var attribute in webGLContextAttributes) {
          contextAttributes[attribute] = webGLContextAttributes[attribute];
        }
      }
      if (typeof GL !== "undefined") {
        contextHandle = GL.createContext(canvas, contextAttributes);
        if (contextHandle) {
          ctx = GL.getContext(contextHandle).GLctx;
        }
      }
    } else {
      ctx = canvas.getContext("2d");
    }
    if (!ctx) return null;
    if (setInModule) {
      if (!useWebGL)
        assert(
          typeof GLctx === "undefined",
          "cannot set in module if GLctx is used, but we are a non-GL context that would replace it"
        );
      Module.ctx = ctx;
      if (useWebGL) GL.makeContextCurrent(contextHandle);
      Module.useWebGL = useWebGL;
      Browser.moduleContextCreatedCallbacks.forEach(function (callback) {
        callback();
      });
      Browser.init();
    }
    return ctx;
  },
  destroyContext: function (canvas, useWebGL, setInModule) {},
  fullscreenHandlersInstalled: false,
  lockPointer: undefined,
  resizeCanvas: undefined,
  requestFullscreen: function (lockPointer, resizeCanvas) {
    Browser.lockPointer = lockPointer;
    Browser.resizeCanvas = resizeCanvas;
    if (typeof Browser.lockPointer === "undefined") Browser.lockPointer = true;
    if (typeof Browser.resizeCanvas === "undefined")
      Browser.resizeCanvas = false;
    var canvas = Module["canvas"];
    function fullscreenChange() {
      Browser.isFullscreen = false;
      var canvasContainer = canvas.parentNode;
      if (
        (document["fullscreenElement"] ||
          document["mozFullScreenElement"] ||
          document["msFullscreenElement"] ||
          document["webkitFullscreenElement"] ||
          document["webkitCurrentFullScreenElement"]) === canvasContainer
      ) {
        canvas.exitFullscreen = Browser.exitFullscreen;
        if (Browser.lockPointer) canvas.requestPointerLock();
        Browser.isFullscreen = true;
        if (Browser.resizeCanvas) {
          Browser.setFullscreenCanvasSize();
        } else {
          Browser.updateCanvasDimensions(canvas);
        }
      } else {
        canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
        canvasContainer.parentNode.removeChild(canvasContainer);
        if (Browser.resizeCanvas) {
          Browser.setWindowedCanvasSize();
        } else {
          Browser.updateCanvasDimensions(canvas);
        }
      }
      if (Module["onFullScreen"]) Module["onFullScreen"](Browser.isFullscreen);
      if (Module["onFullscreen"]) Module["onFullscreen"](Browser.isFullscreen);
    }
    if (!Browser.fullscreenHandlersInstalled) {
      Browser.fullscreenHandlersInstalled = true;
      document.addEventListener("fullscreenchange", fullscreenChange, false);
      document.addEventListener("mozfullscreenchange", fullscreenChange, false);
      document.addEventListener(
        "webkitfullscreenchange",
        fullscreenChange,
        false
      );
      document.addEventListener("MSFullscreenChange", fullscreenChange, false);
    }
    var canvasContainer = document.createElement("div");
    canvas.parentNode.insertBefore(canvasContainer, canvas);
    canvasContainer.appendChild(canvas);
    canvasContainer.requestFullscreen =
      canvasContainer["requestFullscreen"] ||
      canvasContainer["mozRequestFullScreen"] ||
      canvasContainer["msRequestFullscreen"] ||
      (canvasContainer["webkitRequestFullscreen"]
        ? function () {
            canvasContainer["webkitRequestFullscreen"](
              Element["ALLOW_KEYBOARD_INPUT"]
            );
          }
        : null) ||
      (canvasContainer["webkitRequestFullScreen"]
        ? function () {
            canvasContainer["webkitRequestFullScreen"](
              Element["ALLOW_KEYBOARD_INPUT"]
            );
          }
        : null);
    canvasContainer.requestFullscreen();
  },
  exitFullscreen: function () {
    if (!Browser.isFullscreen) {
      return false;
    }
    var CFS =
      document["exitFullscreen"] ||
      document["cancelFullScreen"] ||
      document["mozCancelFullScreen"] ||
      document["msExitFullscreen"] ||
      document["webkitCancelFullScreen"] ||
      function () {};
    CFS.apply(document, []);
    return true;
  },
  nextRAF: 0,
  fakeRequestAnimationFrame: function (func) {
    var now = Date.now();
    if (Browser.nextRAF === 0) {
      Browser.nextRAF = now + 1e3 / 60;
    } else {
      while (now + 2 >= Browser.nextRAF) {
        Browser.nextRAF += 1e3 / 60;
      }
    }
    var delay = Math.max(Browser.nextRAF - now, 0);
    setTimeout(func, delay);
  },
  requestAnimationFrame: function (func) {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(func);
      return;
    }
    var RAF = Browser.fakeRequestAnimationFrame;
    RAF(func);
  },
  safeCallback: function (func) {
    return function () {
      if (!ABORT) return func.apply(null, arguments);
    };
  },
  allowAsyncCallbacks: true,
  queuedAsyncCallbacks: [],
  pauseAsyncCallbacks: function () {
    Browser.allowAsyncCallbacks = false;
  },
  resumeAsyncCallbacks: function () {
    Browser.allowAsyncCallbacks = true;
    if (Browser.queuedAsyncCallbacks.length > 0) {
      var callbacks = Browser.queuedAsyncCallbacks;
      Browser.queuedAsyncCallbacks = [];
      callbacks.forEach(function (func) {
        func();
      });
    }
  },
  safeRequestAnimationFrame: function (func) {
    return Browser.requestAnimationFrame(function () {
      if (ABORT) return;
      if (Browser.allowAsyncCallbacks) {
        func();
      } else {
        Browser.queuedAsyncCallbacks.push(func);
      }
    });
  },
  safeSetTimeout: function (func, timeout) {
    noExitRuntime = true;
    return setTimeout(function () {
      if (ABORT) return;
      if (Browser.allowAsyncCallbacks) {
        func();
      } else {
        Browser.queuedAsyncCallbacks.push(func);
      }
    }, timeout);
  },
  safeSetInterval: function (func, timeout) {
    noExitRuntime = true;
    return setInterval(function () {
      if (ABORT) return;
      if (Browser.allowAsyncCallbacks) {
        func();
      }
    }, timeout);
  },
  getMimetype: function (name) {
    return {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      bmp: "image/bmp",
      ogg: "audio/ogg",
      wav: "audio/wav",
      mp3: "audio/mpeg",
    }[name.substr(name.lastIndexOf(".") + 1)];
  },
  getUserMedia: function (func) {
    if (!window.getUserMedia) {
      window.getUserMedia =
        navigator["getUserMedia"] || navigator["mozGetUserMedia"];
    }
    window.getUserMedia(func);
  },
  getMovementX: function (event) {
    return (
      event["movementX"] ||
      event["mozMovementX"] ||
      event["webkitMovementX"] ||
      0
    );
  },
  getMovementY: function (event) {
    return (
      event["movementY"] ||
      event["mozMovementY"] ||
      event["webkitMovementY"] ||
      0
    );
  },
  getMouseWheelDelta: function (event) {
    var delta = 0;
    switch (event.type) {
      case "DOMMouseScroll":
        delta = event.detail / 3;
        break;
      case "mousewheel":
        delta = event.wheelDelta / 120;
        break;
      case "wheel":
        delta = event.deltaY;
        switch (event.deltaMode) {
          case 0:
            delta /= 100;
            break;
          case 1:
            delta /= 3;
            break;
          case 2:
            delta *= 80;
            break;
          default:
            throw "unrecognized mouse wheel delta mode: " + event.deltaMode;
        }
        break;
      default:
        throw "unrecognized mouse wheel event: " + event.type;
    }
    return delta;
  },
  mouseX: 0,
  mouseY: 0,
  mouseMovementX: 0,
  mouseMovementY: 0,
  touches: {},
  lastTouches: {},
  calculateMouseEvent: function (event) {
    if (Browser.pointerLock) {
      if (event.type != "mousemove" && "mozMovementX" in event) {
        Browser.mouseMovementX = Browser.mouseMovementY = 0;
      } else {
        Browser.mouseMovementX = Browser.getMovementX(event);
        Browser.mouseMovementY = Browser.getMovementY(event);
      }
      if (typeof SDL != "undefined") {
        Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
        Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
      } else {
        Browser.mouseX += Browser.mouseMovementX;
        Browser.mouseY += Browser.mouseMovementY;
      }
    } else {
      var rect = Module["canvas"].getBoundingClientRect();
      var cw = Module["canvas"].width;
      var ch = Module["canvas"].height;
      var scrollX =
        typeof window.scrollX !== "undefined"
          ? window.scrollX
          : window.pageXOffset;
      var scrollY =
        typeof window.scrollY !== "undefined"
          ? window.scrollY
          : window.pageYOffset;
      if (
        event.type === "touchstart" ||
        event.type === "touchend" ||
        event.type === "touchmove"
      ) {
        var touch = event.touch;
        if (touch === undefined) {
          return;
        }
        var adjustedX = touch.pageX - (scrollX + rect.left);
        var adjustedY = touch.pageY - (scrollY + rect.top);
        adjustedX = adjustedX * (cw / rect.width);
        adjustedY = adjustedY * (ch / rect.height);
        var coords = { x: adjustedX, y: adjustedY };
        if (event.type === "touchstart") {
          Browser.lastTouches[touch.identifier] = coords;
          Browser.touches[touch.identifier] = coords;
        } else if (event.type === "touchend" || event.type === "touchmove") {
          var last = Browser.touches[touch.identifier];
          if (!last) last = coords;
          Browser.lastTouches[touch.identifier] = last;
          Browser.touches[touch.identifier] = coords;
        }
        return;
      }
      var x = event.pageX - (scrollX + rect.left);
      var y = event.pageY - (scrollY + rect.top);
      x = x * (cw / rect.width);
      y = y * (ch / rect.height);
      Browser.mouseMovementX = x - Browser.mouseX;
      Browser.mouseMovementY = y - Browser.mouseY;
      Browser.mouseX = x;
      Browser.mouseY = y;
    }
  },
  asyncLoad: function (url, onload, onerror, noRunDep) {
    var dep = !noRunDep ? getUniqueRunDependency("al " + url) : "";
    readAsync(
      url,
      function (arrayBuffer) {
        assert(
          arrayBuffer,
          'Loading data file "' + url + '" failed (no arrayBuffer).'
        );
        onload(new Uint8Array(arrayBuffer));
        if (dep) removeRunDependency(dep);
      },
      function (event) {
        if (onerror) {
          onerror();
        } else {
          throw 'Loading data file "' + url + '" failed.';
        }
      }
    );
    if (dep) addRunDependency(dep);
  },
  resizeListeners: [],
  updateResizeListeners: function () {
    var canvas = Module["canvas"];
    Browser.resizeListeners.forEach(function (listener) {
      listener(canvas.width, canvas.height);
    });
  },
  setCanvasSize: function (width, height, noUpdates) {
    var canvas = Module["canvas"];
    Browser.updateCanvasDimensions(canvas, width, height);
    if (!noUpdates) Browser.updateResizeListeners();
  },
  windowedWidth: 0,
  windowedHeight: 0,
  setFullscreenCanvasSize: function () {
    if (typeof SDL != "undefined") {
      var flags = HEAPU32[SDL.screen >> 2];
      flags = flags | 8388608;
      HEAP32[SDL.screen >> 2] = flags;
    }
    Browser.updateCanvasDimensions(Module["canvas"]);
    Browser.updateResizeListeners();
  },
  setWindowedCanvasSize: function () {
    if (typeof SDL != "undefined") {
      var flags = HEAPU32[SDL.screen >> 2];
      flags = flags & ~8388608;
      HEAP32[SDL.screen >> 2] = flags;
    }
    Browser.updateCanvasDimensions(Module["canvas"]);
    Browser.updateResizeListeners();
  },
  updateCanvasDimensions: function (canvas, wNative, hNative) {
    if (wNative && hNative) {
      canvas.widthNative = wNative;
      canvas.heightNative = hNative;
    } else {
      wNative = canvas.widthNative;
      hNative = canvas.heightNative;
    }
    var w = wNative;
    var h = hNative;
    if (Module["forcedAspectRatio"] && Module["forcedAspectRatio"] > 0) {
      if (w / h < Module["forcedAspectRatio"]) {
        w = Math.round(h * Module["forcedAspectRatio"]);
      } else {
        h = Math.round(w / Module["forcedAspectRatio"]);
      }
    }
    if (
      (document["fullscreenElement"] ||
        document["mozFullScreenElement"] ||
        document["msFullscreenElement"] ||
        document["webkitFullscreenElement"] ||
        document["webkitCurrentFullScreenElement"]) === canvas.parentNode &&
      typeof screen != "undefined"
    ) {
      var factor = Math.min(screen.width / w, screen.height / h);
      w = Math.round(w * factor);
      h = Math.round(h * factor);
    }
    if (Browser.resizeCanvas) {
      if (canvas.width != w) canvas.width = w;
      if (canvas.height != h) canvas.height = h;
      if (typeof canvas.style != "undefined") {
        canvas.style.removeProperty("width");
        canvas.style.removeProperty("height");
      }
    } else {
      if (canvas.width != wNative) canvas.width = wNative;
      if (canvas.height != hNative) canvas.height = hNative;
      if (typeof canvas.style != "undefined") {
        if (w != wNative || h != hNative) {
          canvas.style.setProperty("width", w + "px", "important");
          canvas.style.setProperty("height", h + "px", "important");
        } else {
          canvas.style.removeProperty("width");
          canvas.style.removeProperty("height");
        }
      }
    }
  },
  wgetRequests: {},
  nextWgetRequestHandle: 0,
  getNextWgetRequestHandle: function () {
    var handle = Browser.nextWgetRequestHandle;
    Browser.nextWgetRequestHandle++;
    return handle;
  },
};
function _SDL_GetTicks() {
  return (Date.now() - SDL.startTime) | 0;
}
function _SDL_LockSurface(surf) {
  var surfData = SDL.surfaces[surf];
  surfData.locked++;
  if (surfData.locked > 1) return 0;
  if (!surfData.buffer) {
    surfData.buffer = _malloc(surfData.width * surfData.height * 4);
    HEAP32[(surf + 20) >> 2] = surfData.buffer;
  }
  HEAP32[(surf + 20) >> 2] = surfData.buffer;
  if (surf == SDL.screen && Module.screenIsReadOnly && surfData.image) return 0;
  if (SDL.defaults.discardOnLock) {
    if (!surfData.image) {
      surfData.image = surfData.ctx.createImageData(
        surfData.width,
        surfData.height
      );
    }
    if (!SDL.defaults.opaqueFrontBuffer) return;
  } else {
    surfData.image = surfData.ctx.getImageData(
      0,
      0,
      surfData.width,
      surfData.height
    );
  }
  if (surf == SDL.screen && SDL.defaults.opaqueFrontBuffer) {
    var data = surfData.image.data;
    var num = data.length;
    for (var i = 0; i < num / 4; i++) {
      data[i * 4 + 3] = 255;
    }
  }
  if (SDL.defaults.copyOnLock && !SDL.defaults.discardOnLock) {
    if (surfData.isFlagSet(2097152)) {
      throw (
        "CopyOnLock is not supported for SDL_LockSurface with SDL_HWPALETTE flag set" +
        new Error().stack
      );
    } else {
      HEAPU8.set(surfData.image.data, surfData.buffer);
    }
  }
  return 0;
}
function SDL_unicode() {
  return SDL.unicode;
}
function SDL_ttfContext() {
  return SDL.ttfContext;
}
function SDL_audio() {
  return SDL.audio;
}
var SDL = {
  defaults: {
    width: 320,
    height: 200,
    copyOnLock: true,
    discardOnLock: false,
    opaqueFrontBuffer: true,
  },
  version: null,
  surfaces: {},
  canvasPool: [],
  events: [],
  fonts: [null],
  audios: [null],
  rwops: [null],
  music: { audio: null, volume: 1 },
  mixerFrequency: 22050,
  mixerFormat: 32784,
  mixerNumChannels: 2,
  mixerChunkSize: 1024,
  channelMinimumNumber: 0,
  GL: false,
  glAttributes: {
    0: 3,
    1: 3,
    2: 2,
    3: 0,
    4: 0,
    5: 1,
    6: 16,
    7: 0,
    8: 0,
    9: 0,
    10: 0,
    11: 0,
    12: 0,
    13: 0,
    14: 0,
    15: 1,
    16: 0,
    17: 0,
    18: 0,
  },
  keyboardState: null,
  keyboardMap: {},
  canRequestFullscreen: false,
  isRequestingFullscreen: false,
  textInput: false,
  startTime: null,
  initFlags: 0,
  buttonState: 0,
  modState: 0,
  DOMButtons: [0, 0, 0],
  DOMEventToSDLEvent: {},
  TOUCH_DEFAULT_ID: 0,
  eventHandler: null,
  eventHandlerContext: null,
  eventHandlerTemp: 0,
  keyCodes: {
    16: 1249,
    17: 1248,
    18: 1250,
    20: 1081,
    33: 1099,
    34: 1102,
    35: 1101,
    36: 1098,
    37: 1104,
    38: 1106,
    39: 1103,
    40: 1105,
    44: 316,
    45: 1097,
    46: 127,
    91: 1251,
    93: 1125,
    96: 1122,
    97: 1113,
    98: 1114,
    99: 1115,
    100: 1116,
    101: 1117,
    102: 1118,
    103: 1119,
    104: 1120,
    105: 1121,
    106: 1109,
    107: 1111,
    109: 1110,
    110: 1123,
    111: 1108,
    112: 1082,
    113: 1083,
    114: 1084,
    115: 1085,
    116: 1086,
    117: 1087,
    118: 1088,
    119: 1089,
    120: 1090,
    121: 1091,
    122: 1092,
    123: 1093,
    124: 1128,
    125: 1129,
    126: 1130,
    127: 1131,
    128: 1132,
    129: 1133,
    130: 1134,
    131: 1135,
    132: 1136,
    133: 1137,
    134: 1138,
    135: 1139,
    144: 1107,
    160: 94,
    161: 33,
    162: 34,
    163: 35,
    164: 36,
    165: 37,
    166: 38,
    167: 95,
    168: 40,
    169: 41,
    170: 42,
    171: 43,
    172: 124,
    173: 45,
    174: 123,
    175: 125,
    176: 126,
    181: 127,
    182: 129,
    183: 128,
    188: 44,
    190: 46,
    191: 47,
    192: 96,
    219: 91,
    220: 92,
    221: 93,
    222: 39,
    224: 1251,
  },
  scanCodes: {
    8: 42,
    9: 43,
    13: 40,
    27: 41,
    32: 44,
    35: 204,
    39: 53,
    44: 54,
    46: 55,
    47: 56,
    48: 39,
    49: 30,
    50: 31,
    51: 32,
    52: 33,
    53: 34,
    54: 35,
    55: 36,
    56: 37,
    57: 38,
    58: 203,
    59: 51,
    61: 46,
    91: 47,
    92: 49,
    93: 48,
    96: 52,
    97: 4,
    98: 5,
    99: 6,
    100: 7,
    101: 8,
    102: 9,
    103: 10,
    104: 11,
    105: 12,
    106: 13,
    107: 14,
    108: 15,
    109: 16,
    110: 17,
    111: 18,
    112: 19,
    113: 20,
    114: 21,
    115: 22,
    116: 23,
    117: 24,
    118: 25,
    119: 26,
    120: 27,
    121: 28,
    122: 29,
    127: 76,
    305: 224,
    308: 226,
    316: 70,
  },
  loadRect: function (rect) {
    return {
      x: HEAP32[(rect + 0) >> 2],
      y: HEAP32[(rect + 4) >> 2],
      w: HEAP32[(rect + 8) >> 2],
      h: HEAP32[(rect + 12) >> 2],
    };
  },
  updateRect: function (rect, r) {
    HEAP32[rect >> 2] = r.x;
    HEAP32[(rect + 4) >> 2] = r.y;
    HEAP32[(rect + 8) >> 2] = r.w;
    HEAP32[(rect + 12) >> 2] = r.h;
  },
  intersectionOfRects: function (first, second) {
    var leftX = Math.max(first.x, second.x);
    var leftY = Math.max(first.y, second.y);
    var rightX = Math.min(first.x + first.w, second.x + second.w);
    var rightY = Math.min(first.y + first.h, second.y + second.h);
    return {
      x: leftX,
      y: leftY,
      w: Math.max(leftX, rightX) - leftX,
      h: Math.max(leftY, rightY) - leftY,
    };
  },
  checkPixelFormat: function (fmt) {},
  loadColorToCSSRGB: function (color) {
    var rgba = HEAP32[color >> 2];
    return (
      "rgb(" +
      (rgba & 255) +
      "," +
      ((rgba >> 8) & 255) +
      "," +
      ((rgba >> 16) & 255) +
      ")"
    );
  },
  loadColorToCSSRGBA: function (color) {
    var rgba = HEAP32[color >> 2];
    return (
      "rgba(" +
      (rgba & 255) +
      "," +
      ((rgba >> 8) & 255) +
      "," +
      ((rgba >> 16) & 255) +
      "," +
      ((rgba >> 24) & 255) / 255 +
      ")"
    );
  },
  translateColorToCSSRGBA: function (rgba) {
    return (
      "rgba(" +
      (rgba & 255) +
      "," +
      ((rgba >> 8) & 255) +
      "," +
      ((rgba >> 16) & 255) +
      "," +
      (rgba >>> 24) / 255 +
      ")"
    );
  },
  translateRGBAToCSSRGBA: function (r, g, b, a) {
    return (
      "rgba(" +
      (r & 255) +
      "," +
      (g & 255) +
      "," +
      (b & 255) +
      "," +
      (a & 255) / 255 +
      ")"
    );
  },
  translateRGBAToColor: function (r, g, b, a) {
    return r | (g << 8) | (b << 16) | (a << 24);
  },
  makeSurface: function (
    width,
    height,
    flags,
    usePageCanvas,
    source,
    rmask,
    gmask,
    bmask,
    amask
  ) {
    flags = flags || 0;
    var is_SDL_HWSURFACE = flags & 1;
    var is_SDL_HWPALETTE = flags & 2097152;
    var is_SDL_OPENGL = flags & 67108864;
    var surf = _malloc(60);
    var pixelFormat = _malloc(44);
    var bpp = is_SDL_HWPALETTE ? 1 : 4;
    var buffer = 0;
    if (!is_SDL_HWSURFACE && !is_SDL_OPENGL) {
      buffer = _malloc(width * height * 4);
    }
    HEAP32[surf >> 2] = flags;
    HEAP32[(surf + 4) >> 2] = pixelFormat;
    HEAP32[(surf + 8) >> 2] = width;
    HEAP32[(surf + 12) >> 2] = height;
    HEAP32[(surf + 16) >> 2] = width * bpp;
    HEAP32[(surf + 20) >> 2] = buffer;
    HEAP32[(surf + 36) >> 2] = 0;
    HEAP32[(surf + 40) >> 2] = 0;
    HEAP32[(surf + 44) >> 2] = Module["canvas"].width;
    HEAP32[(surf + 48) >> 2] = Module["canvas"].height;
    HEAP32[(surf + 56) >> 2] = 1;
    HEAP32[pixelFormat >> 2] = -2042224636;
    HEAP32[(pixelFormat + 4) >> 2] = 0;
    HEAP8[(pixelFormat + 8) >> 0] = bpp * 8;
    HEAP8[(pixelFormat + 9) >> 0] = bpp;
    HEAP32[(pixelFormat + 12) >> 2] = rmask || 255;
    HEAP32[(pixelFormat + 16) >> 2] = gmask || 65280;
    HEAP32[(pixelFormat + 20) >> 2] = bmask || 16711680;
    HEAP32[(pixelFormat + 24) >> 2] = amask || 4278190080;
    SDL.GL = SDL.GL || is_SDL_OPENGL;
    var canvas;
    if (!usePageCanvas) {
      if (SDL.canvasPool.length > 0) {
        canvas = SDL.canvasPool.pop();
      } else {
        canvas = document.createElement("canvas");
      }
      canvas.width = width;
      canvas.height = height;
    } else {
      canvas = Module["canvas"];
    }
    var webGLContextAttributes = {
      antialias: SDL.glAttributes[13] != 0 && SDL.glAttributes[14] > 1,
      depth: SDL.glAttributes[6] > 0,
      stencil: SDL.glAttributes[7] > 0,
      alpha: SDL.glAttributes[3] > 0,
    };
    var ctx = Browser.createContext(
      canvas,
      is_SDL_OPENGL,
      usePageCanvas,
      webGLContextAttributes
    );
    SDL.surfaces[surf] = {
      width: width,
      height: height,
      canvas: canvas,
      ctx: ctx,
      surf: surf,
      buffer: buffer,
      pixelFormat: pixelFormat,
      alpha: 255,
      flags: flags,
      locked: 0,
      usePageCanvas: usePageCanvas,
      source: source,
      isFlagSet: function (flag) {
        return flags & flag;
      },
    };
    return surf;
  },
  copyIndexedColorData: function (surfData, rX, rY, rW, rH) {
    if (!surfData.colors) {
      return;
    }
    var fullWidth = Module["canvas"].width;
    var fullHeight = Module["canvas"].height;
    var startX = rX || 0;
    var startY = rY || 0;
    var endX = (rW || fullWidth - startX) + startX;
    var endY = (rH || fullHeight - startY) + startY;
    var buffer = surfData.buffer;
    if (!surfData.image.data32) {
      surfData.image.data32 = new Uint32Array(surfData.image.data.buffer);
    }
    var data32 = surfData.image.data32;
    var colors32 = surfData.colors32;
    for (var y = startY; y < endY; ++y) {
      var base = y * fullWidth;
      for (var x = startX; x < endX; ++x) {
        data32[base + x] = colors32[HEAPU8[(buffer + base + x) >> 0]];
      }
    }
  },
  freeSurface: function (surf) {
    var refcountPointer = surf + 56;
    var refcount = HEAP32[refcountPointer >> 2];
    if (refcount > 1) {
      HEAP32[refcountPointer >> 2] = refcount - 1;
      return;
    }
    var info = SDL.surfaces[surf];
    if (!info.usePageCanvas && info.canvas) SDL.canvasPool.push(info.canvas);
    if (info.buffer) _free(info.buffer);
    _free(info.pixelFormat);
    _free(surf);
    SDL.surfaces[surf] = null;
    if (surf === SDL.screen) {
      SDL.screen = null;
    }
  },
  blitSurface: function (src, srcrect, dst, dstrect, scale) {
    var srcData = SDL.surfaces[src];
    var dstData = SDL.surfaces[dst];
    var sr, dr;
    if (srcrect) {
      sr = SDL.loadRect(srcrect);
    } else {
      sr = { x: 0, y: 0, w: srcData.width, h: srcData.height };
    }
    if (dstrect) {
      dr = SDL.loadRect(dstrect);
    } else {
      dr = { x: 0, y: 0, w: srcData.width, h: srcData.height };
    }
    if (dstData.clipRect) {
      var widthScale = !scale || sr.w === 0 ? 1 : sr.w / dr.w;
      var heightScale = !scale || sr.h === 0 ? 1 : sr.h / dr.h;
      dr = SDL.intersectionOfRects(dstData.clipRect, dr);
      sr.w = dr.w * widthScale;
      sr.h = dr.h * heightScale;
      if (dstrect) {
        SDL.updateRect(dstrect, dr);
      }
    }
    var blitw, blith;
    if (scale) {
      blitw = dr.w;
      blith = dr.h;
    } else {
      blitw = sr.w;
      blith = sr.h;
    }
    if (sr.w === 0 || sr.h === 0 || blitw === 0 || blith === 0) {
      return 0;
    }
    var oldAlpha = dstData.ctx.globalAlpha;
    dstData.ctx.globalAlpha = srcData.alpha / 255;
    dstData.ctx.drawImage(
      srcData.canvas,
      sr.x,
      sr.y,
      sr.w,
      sr.h,
      dr.x,
      dr.y,
      blitw,
      blith
    );
    dstData.ctx.globalAlpha = oldAlpha;
    if (dst != SDL.screen) {
      warnOnce("WARNING: copying canvas data to memory for compatibility");
      _SDL_LockSurface(dst);
      dstData.locked--;
    }
    return 0;
  },
  downFingers: {},
  savedKeydown: null,
  receiveEvent: function (event) {
    function unpressAllPressedKeys() {
      for (var code in SDL.keyboardMap) {
        SDL.events.push({ type: "keyup", keyCode: SDL.keyboardMap[code] });
      }
    }
    switch (event.type) {
      case "touchstart":
      case "touchmove": {
        event.preventDefault();
        var touches = [];
        if (event.type === "touchstart") {
          for (var i = 0; i < event.touches.length; i++) {
            var touch = event.touches[i];
            if (SDL.downFingers[touch.identifier] != true) {
              SDL.downFingers[touch.identifier] = true;
              touches.push(touch);
            }
          }
        } else {
          touches = event.touches;
        }
        var firstTouch = touches[0];
        if (firstTouch) {
          if (event.type == "touchstart") {
            SDL.DOMButtons[0] = 1;
          }
          var mouseEventType;
          switch (event.type) {
            case "touchstart":
              mouseEventType = "mousedown";
              break;
            case "touchmove":
              mouseEventType = "mousemove";
              break;
          }
          var mouseEvent = {
            type: mouseEventType,
            button: 0,
            pageX: firstTouch.clientX,
            pageY: firstTouch.clientY,
          };
          SDL.events.push(mouseEvent);
        }
        for (var i = 0; i < touches.length; i++) {
          var touch = touches[i];
          SDL.events.push({ type: event.type, touch: touch });
        }
        break;
      }
      case "touchend": {
        event.preventDefault();
        for (var i = 0; i < event.changedTouches.length; i++) {
          var touch = event.changedTouches[i];
          if (SDL.downFingers[touch.identifier] === true) {
            delete SDL.downFingers[touch.identifier];
          }
        }
        var mouseEvent = {
          type: "mouseup",
          button: 0,
          pageX: event.changedTouches[0].clientX,
          pageY: event.changedTouches[0].clientY,
        };
        SDL.DOMButtons[0] = 0;
        SDL.events.push(mouseEvent);
        for (var i = 0; i < event.changedTouches.length; i++) {
          var touch = event.changedTouches[i];
          SDL.events.push({ type: "touchend", touch: touch });
        }
        break;
      }
      case "DOMMouseScroll":
      case "mousewheel":
      case "wheel":
        var delta = -Browser.getMouseWheelDelta(event);
        delta =
          delta == 0 ? 0 : delta > 0 ? Math.max(delta, 1) : Math.min(delta, -1);
        var button = delta > 0 ? 3 : 4;
        SDL.events.push({
          type: "mousedown",
          button: button,
          pageX: event.pageX,
          pageY: event.pageY,
        });
        SDL.events.push({
          type: "mouseup",
          button: button,
          pageX: event.pageX,
          pageY: event.pageY,
        });
        SDL.events.push({ type: "wheel", deltaX: 0, deltaY: delta });
        event.preventDefault();
        break;
      case "mousemove":
        if (SDL.DOMButtons[0] === 1) {
          SDL.events.push({
            type: "touchmove",
            touch: {
              identifier: 0,
              deviceID: -1,
              pageX: event.pageX,
              pageY: event.pageY,
            },
          });
        }
        if (Browser.pointerLock) {
          if ("mozMovementX" in event) {
            event["movementX"] = event["mozMovementX"];
            event["movementY"] = event["mozMovementY"];
          }
          if (event["movementX"] == 0 && event["movementY"] == 0) {
            event.preventDefault();
            return;
          }
        }
      case "keydown":
      case "keyup":
      case "keypress":
      case "mousedown":
      case "mouseup":
        if (
          event.type !== "keydown" ||
          (!SDL_unicode() && !SDL.textInput) ||
          event.keyCode === 8 ||
          event.keyCode === 9
        ) {
          event.preventDefault();
        }
        if (event.type == "mousedown") {
          SDL.DOMButtons[event.button] = 1;
          SDL.events.push({
            type: "touchstart",
            touch: {
              identifier: 0,
              deviceID: -1,
              pageX: event.pageX,
              pageY: event.pageY,
            },
          });
        } else if (event.type == "mouseup") {
          if (!SDL.DOMButtons[event.button]) {
            return;
          }
          SDL.events.push({
            type: "touchend",
            touch: {
              identifier: 0,
              deviceID: -1,
              pageX: event.pageX,
              pageY: event.pageY,
            },
          });
          SDL.DOMButtons[event.button] = 0;
        }
        if (event.type === "keydown" || event.type === "mousedown") {
          SDL.canRequestFullscreen = true;
        } else if (event.type === "keyup" || event.type === "mouseup") {
          if (SDL.isRequestingFullscreen) {
            Module["requestFullscreen"](true, true);
            SDL.isRequestingFullscreen = false;
          }
          SDL.canRequestFullscreen = false;
        }
        if (event.type === "keypress" && SDL.savedKeydown) {
          SDL.savedKeydown.keypressCharCode = event.charCode;
          SDL.savedKeydown = null;
        } else if (event.type === "keydown") {
          SDL.savedKeydown = event;
        }
        if (event.type !== "keypress" || SDL.textInput) {
          SDL.events.push(event);
        }
        break;
      case "mouseout":
        for (var i = 0; i < 3; i++) {
          if (SDL.DOMButtons[i]) {
            SDL.events.push({
              type: "mouseup",
              button: i,
              pageX: event.pageX,
              pageY: event.pageY,
            });
            SDL.DOMButtons[i] = 0;
          }
        }
        event.preventDefault();
        break;
      case "focus":
        SDL.events.push(event);
        event.preventDefault();
        break;
      case "blur":
        SDL.events.push(event);
        unpressAllPressedKeys();
        event.preventDefault();
        break;
      case "visibilitychange":
        SDL.events.push({
          type: "visibilitychange",
          visible: !document.hidden,
        });
        unpressAllPressedKeys();
        event.preventDefault();
        break;
      case "unload":
        if (Browser.mainLoop.runner) {
          SDL.events.push(event);
          Browser.mainLoop.runner();
        }
        return;
      case "resize":
        SDL.events.push(event);
        if (event.preventDefault) {
          event.preventDefault();
        }
        break;
    }
    if (SDL.events.length >= 1e4) {
      err("SDL event queue full, dropping events");
      SDL.events = SDL.events.slice(0, 1e4);
    }
    SDL.flushEventsToHandler();
    return;
  },
  lookupKeyCodeForEvent: function (event) {
    var code = event.keyCode;
    if (code >= 65 && code <= 90) {
      code += 32;
    } else {
      code = SDL.keyCodes[event.keyCode] || event.keyCode;
      if (
        event.location === 2 &&
        code >= (224 | (1 << 10)) &&
        code <= (227 | (1 << 10))
      ) {
        code += 4;
      }
    }
    return code;
  },
  handleEvent: function (event) {
    if (event.handled) return;
    event.handled = true;
    switch (event.type) {
      case "touchstart":
      case "touchend":
      case "touchmove": {
        Browser.calculateMouseEvent(event);
        break;
      }
      case "keydown":
      case "keyup": {
        var down = event.type === "keydown";
        var code = SDL.lookupKeyCodeForEvent(event);
        HEAP8[(SDL.keyboardState + code) >> 0] = down;
        SDL.modState =
          (HEAP8[(SDL.keyboardState + 1248) >> 0] ? 64 : 0) |
          (HEAP8[(SDL.keyboardState + 1249) >> 0] ? 1 : 0) |
          (HEAP8[(SDL.keyboardState + 1250) >> 0] ? 256 : 0) |
          (HEAP8[(SDL.keyboardState + 1252) >> 0] ? 128 : 0) |
          (HEAP8[(SDL.keyboardState + 1253) >> 0] ? 2 : 0) |
          (HEAP8[(SDL.keyboardState + 1254) >> 0] ? 512 : 0);
        if (down) {
          SDL.keyboardMap[code] = event.keyCode;
        } else {
          delete SDL.keyboardMap[code];
        }
        break;
      }
      case "mousedown":
      case "mouseup":
        if (event.type == "mousedown") {
          SDL.buttonState |= 1 << event.button;
        } else if (event.type == "mouseup") {
          SDL.buttonState &= ~(1 << event.button);
        }
      case "mousemove": {
        Browser.calculateMouseEvent(event);
        break;
      }
    }
  },
  flushEventsToHandler: function () {
    if (!SDL.eventHandler) return;
    while (SDL.pollEvent(SDL.eventHandlerTemp)) {
      wasmTable.get(SDL.eventHandler)(
        SDL.eventHandlerContext,
        SDL.eventHandlerTemp
      );
    }
  },
  pollEvent: function (ptr) {
    if (SDL.initFlags & 512 && SDL.joystickEventState) {
      SDL.queryJoysticks();
    }
    if (ptr) {
      while (SDL.events.length > 0) {
        if (SDL.makeCEvent(SDL.events.shift(), ptr) !== false) return 1;
      }
      return 0;
    } else {
      return SDL.events.length > 0;
    }
  },
  makeCEvent: function (event, ptr) {
    if (typeof event === "number") {
      _memcpy(ptr, event, 28);
      _free(event);
      return;
    }
    SDL.handleEvent(event);
    switch (event.type) {
      case "keydown":
      case "keyup": {
        var down = event.type === "keydown";
        var key = SDL.lookupKeyCodeForEvent(event);
        var scan;
        if (key >= 1024) {
          scan = key - 1024;
        } else {
          scan = SDL.scanCodes[key] || key;
        }
        HEAP32[ptr >> 2] = SDL.DOMEventToSDLEvent[event.type];
        HEAP8[(ptr + 8) >> 0] = down ? 1 : 0;
        HEAP8[(ptr + 9) >> 0] = 0;
        HEAP32[(ptr + 12) >> 2] = scan;
        HEAP32[(ptr + 16) >> 2] = key;
        HEAP16[(ptr + 20) >> 1] = SDL.modState;
        HEAP32[(ptr + 24) >> 2] = event.keypressCharCode || key;
        break;
      }
      case "keypress": {
        HEAP32[ptr >> 2] = SDL.DOMEventToSDLEvent[event.type];
        var cStr = intArrayFromString(String.fromCharCode(event.charCode));
        for (var i = 0; i < cStr.length; ++i) {
          HEAP8[(ptr + (8 + i)) >> 0] = cStr[i];
        }
        break;
      }
      case "mousedown":
      case "mouseup":
      case "mousemove": {
        if (event.type != "mousemove") {
          var down = event.type === "mousedown";
          HEAP32[ptr >> 2] = SDL.DOMEventToSDLEvent[event.type];
          HEAP32[(ptr + 4) >> 2] = 0;
          HEAP32[(ptr + 8) >> 2] = 0;
          HEAP32[(ptr + 12) >> 2] = 0;
          HEAP8[(ptr + 16) >> 0] = event.button + 1;
          HEAP8[(ptr + 17) >> 0] = down ? 1 : 0;
          HEAP32[(ptr + 20) >> 2] = Browser.mouseX;
          HEAP32[(ptr + 24) >> 2] = Browser.mouseY;
        } else {
          HEAP32[ptr >> 2] = SDL.DOMEventToSDLEvent[event.type];
          HEAP32[(ptr + 4) >> 2] = 0;
          HEAP32[(ptr + 8) >> 2] = 0;
          HEAP32[(ptr + 12) >> 2] = 0;
          HEAP32[(ptr + 16) >> 2] = SDL.buttonState;
          HEAP32[(ptr + 20) >> 2] = Browser.mouseX;
          HEAP32[(ptr + 24) >> 2] = Browser.mouseY;
          HEAP32[(ptr + 28) >> 2] = Browser.mouseMovementX;
          HEAP32[(ptr + 32) >> 2] = Browser.mouseMovementY;
        }
        break;
      }
      case "wheel": {
        HEAP32[ptr >> 2] = SDL.DOMEventToSDLEvent[event.type];
        HEAP32[(ptr + 16) >> 2] = event.deltaX;
        HEAP32[(ptr + 20) >> 2] = event.deltaY;
        break;
      }
      case "touchstart":
      case "touchend":
      case "touchmove": {
        var touch = event.touch;
        if (!Browser.touches[touch.identifier]) break;
        var w = Module["canvas"].width;
        var h = Module["canvas"].height;
        var x = Browser.touches[touch.identifier].x / w;
        var y = Browser.touches[touch.identifier].y / h;
        var lx = Browser.lastTouches[touch.identifier].x / w;
        var ly = Browser.lastTouches[touch.identifier].y / h;
        var dx = x - lx;
        var dy = y - ly;
        if (touch["deviceID"] === undefined)
          touch.deviceID = SDL.TOUCH_DEFAULT_ID;
        if (dx === 0 && dy === 0 && event.type === "touchmove") return false;
        HEAP32[ptr >> 2] = SDL.DOMEventToSDLEvent[event.type];
        HEAP32[(ptr + 4) >> 2] = _SDL_GetTicks();
        (tempI64 = [
          touch.deviceID >>> 0,
          ((tempDouble = touch.deviceID),
          +Math.abs(tempDouble) >= 1
            ? tempDouble > 0
              ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) |
                  0) >>>
                0
              : ~~+Math.ceil(
                  (tempDouble - +(~~tempDouble >>> 0)) / 4294967296
                ) >>> 0
            : 0),
        ]),
          (HEAP32[(ptr + 8) >> 2] = tempI64[0]),
          (HEAP32[(ptr + 12) >> 2] = tempI64[1]);
        (tempI64 = [
          touch.identifier >>> 0,
          ((tempDouble = touch.identifier),
          +Math.abs(tempDouble) >= 1
            ? tempDouble > 0
              ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) |
                  0) >>>
                0
              : ~~+Math.ceil(
                  (tempDouble - +(~~tempDouble >>> 0)) / 4294967296
                ) >>> 0
            : 0),
        ]),
          (HEAP32[(ptr + 16) >> 2] = tempI64[0]),
          (HEAP32[(ptr + 20) >> 2] = tempI64[1]);
        HEAPF32[(ptr + 24) >> 2] = x;
        HEAPF32[(ptr + 28) >> 2] = y;
        HEAPF32[(ptr + 32) >> 2] = dx;
        HEAPF32[(ptr + 36) >> 2] = dy;
        if (touch.force !== undefined) {
          HEAPF32[(ptr + 40) >> 2] = touch.force;
        } else {
          HEAPF32[(ptr + 40) >> 2] = event.type == "touchend" ? 0 : 1;
        }
        break;
      }
      case "unload": {
        HEAP32[ptr >> 2] = SDL.DOMEventToSDLEvent[event.type];
        break;
      }
      case "resize": {
        HEAP32[ptr >> 2] = SDL.DOMEventToSDLEvent[event.type];
        HEAP32[(ptr + 4) >> 2] = event.w;
        HEAP32[(ptr + 8) >> 2] = event.h;
        break;
      }
      case "joystick_button_up":
      case "joystick_button_down": {
        var state = event.type === "joystick_button_up" ? 0 : 1;
        HEAP32[ptr >> 2] = SDL.DOMEventToSDLEvent[event.type];
        HEAP8[(ptr + 4) >> 0] = event.index;
        HEAP8[(ptr + 5) >> 0] = event.button;
        HEAP8[(ptr + 6) >> 0] = state;
        break;
      }
      case "joystick_axis_motion": {
        HEAP32[ptr >> 2] = SDL.DOMEventToSDLEvent[event.type];
        HEAP8[(ptr + 4) >> 0] = event.index;
        HEAP8[(ptr + 5) >> 0] = event.axis;
        HEAP32[(ptr + 8) >> 2] = SDL.joystickAxisValueConversion(event.value);
        break;
      }
      case "focus": {
        var SDL_WINDOWEVENT_FOCUS_GAINED = 12;
        HEAP32[ptr >> 2] = SDL.DOMEventToSDLEvent[event.type];
        HEAP32[(ptr + 4) >> 2] = 0;
        HEAP8[(ptr + 8) >> 0] = SDL_WINDOWEVENT_FOCUS_GAINED;
        break;
      }
      case "blur": {
        var SDL_WINDOWEVENT_FOCUS_LOST = 13;
        HEAP32[ptr >> 2] = SDL.DOMEventToSDLEvent[event.type];
        HEAP32[(ptr + 4) >> 2] = 0;
        HEAP8[(ptr + 8) >> 0] = SDL_WINDOWEVENT_FOCUS_LOST;
        break;
      }
      case "visibilitychange": {
        var SDL_WINDOWEVENT_SHOWN = 1;
        var SDL_WINDOWEVENT_HIDDEN = 2;
        var visibilityEventID = event.visible
          ? SDL_WINDOWEVENT_SHOWN
          : SDL_WINDOWEVENT_HIDDEN;
        HEAP32[ptr >> 2] = SDL.DOMEventToSDLEvent[event.type];
        HEAP32[(ptr + 4) >> 2] = 0;
        HEAP8[(ptr + 8) >> 0] = visibilityEventID;
        break;
      }
      default:
        throw "Unhandled SDL event: " + event.type;
    }
  },
  makeFontString: function (height, fontName) {
    if (fontName.charAt(0) != "'" && fontName.charAt(0) != '"') {
      fontName = '"' + fontName + '"';
    }
    return height + "px " + fontName + ", serif";
  },
  estimateTextWidth: function (fontData, text) {
    var h = fontData.size;
    var fontString = SDL.makeFontString(h, fontData.name);
    var tempCtx = SDL_ttfContext();
    tempCtx.font = fontString;
    var ret = tempCtx.measureText(text).width | 0;
    return ret;
  },
  allocateChannels: function (num) {
    if (SDL.numChannels && SDL.numChannels >= num && num != 0) return;
    SDL.numChannels = num;
    SDL.channels = [];
    for (var i = 0; i < num; i++) {
      SDL.channels[i] = { audio: null, volume: 1 };
    }
  },
  setGetVolume: function (info, volume) {
    if (!info) return 0;
    var ret = info.volume * 128;
    if (volume != -1) {
      info.volume = Math.min(Math.max(volume, 0), 128) / 128;
      if (info.audio) {
        try {
          info.audio.volume = info.volume;
          if (info.audio.webAudioGainNode)
            info.audio.webAudioGainNode["gain"]["value"] = info.volume;
        } catch (e) {
          err("setGetVolume failed to set audio volume: " + e);
        }
      }
    }
    return ret;
  },
  setPannerPosition: function (info, x, y, z) {
    if (!info) return;
    if (info.audio) {
      if (info.audio.webAudioPannerNode) {
        info.audio.webAudioPannerNode["setPosition"](x, y, z);
      }
    }
  },
  playWebAudio: function (audio) {
    if (!audio) return;
    if (audio.webAudioNode) return;
    if (!SDL.webAudioAvailable()) return;
    try {
      var webAudio = audio.resource.webAudio;
      audio.paused = false;
      if (!webAudio.decodedBuffer) {
        if (webAudio.onDecodeComplete === undefined)
          abort("Cannot play back audio object that was not loaded");
        webAudio.onDecodeComplete.push(function () {
          if (!audio.paused) SDL.playWebAudio(audio);
        });
        return;
      }
      audio.webAudioNode = SDL.audioContext["createBufferSource"]();
      audio.webAudioNode["buffer"] = webAudio.decodedBuffer;
      audio.webAudioNode["loop"] = audio.loop;
      audio.webAudioNode["onended"] = function () {
        audio["onended"]();
      };
      audio.webAudioPannerNode = SDL.audioContext["createPanner"]();
      audio.webAudioPannerNode["setPosition"](0, 0, -0.5);
      audio.webAudioPannerNode["panningModel"] = "equalpower";
      audio.webAudioGainNode = SDL.audioContext["createGain"]();
      audio.webAudioGainNode["gain"]["value"] = audio.volume;
      audio.webAudioNode["connect"](audio.webAudioPannerNode);
      audio.webAudioPannerNode["connect"](audio.webAudioGainNode);
      audio.webAudioGainNode["connect"](SDL.audioContext["destination"]);
      audio.webAudioNode["start"](0, audio.currentPosition);
      audio.startTime = SDL.audioContext["currentTime"] - audio.currentPosition;
    } catch (e) {
      err("playWebAudio failed: " + e);
    }
  },
  pauseWebAudio: function (audio) {
    if (!audio) return;
    if (audio.webAudioNode) {
      try {
        audio.currentPosition =
          (SDL.audioContext["currentTime"] - audio.startTime) %
          audio.resource.webAudio.decodedBuffer.duration;
        audio.webAudioNode["onended"] = undefined;
        audio.webAudioNode.stop(0);
        audio.webAudioNode = undefined;
      } catch (e) {
        err("pauseWebAudio failed: " + e);
      }
    }
    audio.paused = true;
  },
  openAudioContext: function () {
    if (!SDL.audioContext) {
      if (typeof AudioContext !== "undefined")
        SDL.audioContext = new AudioContext();
      else if (typeof webkitAudioContext !== "undefined")
        SDL.audioContext = new webkitAudioContext();
    }
  },
  webAudioAvailable: function () {
    return !!SDL.audioContext;
  },
  fillWebAudioBufferFromHeap: function (
    heapPtr,
    sizeSamplesPerChannel,
    dstAudioBuffer
  ) {
    var audio = SDL_audio();
    var numChannels = audio.channels;
    for (var c = 0; c < numChannels; ++c) {
      var channelData = dstAudioBuffer["getChannelData"](c);
      if (channelData.length != sizeSamplesPerChannel) {
        throw (
          "Web Audio output buffer length mismatch! Destination size: " +
          channelData.length +
          " samples vs expected " +
          sizeSamplesPerChannel +
          " samples!"
        );
      }
      if (audio.format == 32784) {
        for (var j = 0; j < sizeSamplesPerChannel; ++j) {
          channelData[j] =
            HEAP16[(heapPtr + (j * numChannels + c) * 2) >> 1] / 32768;
        }
      } else if (audio.format == 8) {
        for (var j = 0; j < sizeSamplesPerChannel; ++j) {
          var v = HEAP8[(heapPtr + (j * numChannels + c)) >> 0];
          channelData[j] = (v >= 0 ? v - 128 : v + 128) / 128;
        }
      } else if (audio.format == 33056) {
        for (var j = 0; j < sizeSamplesPerChannel; ++j) {
          channelData[j] = HEAPF32[(heapPtr + (j * numChannels + c) * 4) >> 2];
        }
      } else {
        throw "Invalid SDL audio format " + audio.format + "!";
      }
    }
  },
  debugSurface: function (surfData) {
    console.log(
      "dumping surface " +
        [surfData.surf, surfData.source, surfData.width, surfData.height]
    );
    var image = surfData.ctx.getImageData(
      0,
      0,
      surfData.width,
      surfData.height
    );
    var data = image.data;
    var num = Math.min(surfData.width, surfData.height);
    for (var i = 0; i < num; i++) {
      console.log(
        "   diagonal " +
          i +
          ":" +
          [
            data[i * surfData.width * 4 + i * 4 + 0],
            data[i * surfData.width * 4 + i * 4 + 1],
            data[i * surfData.width * 4 + i * 4 + 2],
            data[i * surfData.width * 4 + i * 4 + 3],
          ]
      );
    }
  },
  joystickEventState: 1,
  lastJoystickState: {},
  joystickNamePool: {},
  recordJoystickState: function (joystick, state) {
    var buttons = new Array(state.buttons.length);
    for (var i = 0; i < state.buttons.length; i++) {
      buttons[i] = SDL.getJoystickButtonState(state.buttons[i]);
    }
    SDL.lastJoystickState[joystick] = {
      buttons: buttons,
      axes: state.axes.slice(0),
      timestamp: state.timestamp,
      index: state.index,
      id: state.id,
    };
  },
  getJoystickButtonState: function (button) {
    if (typeof button === "object") {
      return button["pressed"];
    } else {
      return button > 0;
    }
  },
  queryJoysticks: function () {
    for (var joystick in SDL.lastJoystickState) {
      var state = SDL.getGamepad(joystick - 1);
      var prevState = SDL.lastJoystickState[joystick];
      if (typeof state === "undefined") return;
      if (state === null) return;
      if (
        typeof state.timestamp !== "number" ||
        state.timestamp !== prevState.timestamp ||
        !state.timestamp
      ) {
        var i;
        for (i = 0; i < state.buttons.length; i++) {
          var buttonState = SDL.getJoystickButtonState(state.buttons[i]);
          if (buttonState !== prevState.buttons[i]) {
            SDL.events.push({
              type: buttonState ? "joystick_button_down" : "joystick_button_up",
              joystick: joystick,
              index: joystick - 1,
              button: i,
            });
          }
        }
        for (i = 0; i < state.axes.length; i++) {
          if (state.axes[i] !== prevState.axes[i]) {
            SDL.events.push({
              type: "joystick_axis_motion",
              joystick: joystick,
              index: joystick - 1,
              axis: i,
              value: state.axes[i],
            });
          }
        }
        SDL.recordJoystickState(joystick, state);
      }
    }
  },
  joystickAxisValueConversion: function (value) {
    value = Math.min(1, Math.max(value, -1));
    return Math.ceil((value + 1) * 32767.5 - 32768);
  },
  getGamepads: function () {
    var fcn =
      navigator.getGamepads ||
      navigator.webkitGamepads ||
      navigator.mozGamepads ||
      navigator.gamepads ||
      navigator.webkitGetGamepads;
    if (fcn !== undefined) {
      return fcn.apply(navigator);
    } else {
      return [];
    }
  },
  getGamepad: function (deviceIndex) {
    var gamepads = SDL.getGamepads();
    if (gamepads.length > deviceIndex && deviceIndex >= 0) {
      return gamepads[deviceIndex];
    }
    return null;
  },
};
function _SDL_Init(initFlags) {
  SDL.startTime = Date.now();
  SDL.initFlags = initFlags;
  if (!Module["doNotCaptureKeyboard"]) {
    var keyboardListeningElement =
      Module["keyboardListeningElement"] || document;
    keyboardListeningElement.addEventListener("keydown", SDL.receiveEvent);
    keyboardListeningElement.addEventListener("keyup", SDL.receiveEvent);
    keyboardListeningElement.addEventListener("keypress", SDL.receiveEvent);
    window.addEventListener("focus", SDL.receiveEvent);
    window.addEventListener("blur", SDL.receiveEvent);
    document.addEventListener("visibilitychange", SDL.receiveEvent);
  }
  window.addEventListener("unload", SDL.receiveEvent);
  SDL.keyboardState = _malloc(65536);
  _memset(SDL.keyboardState, 0, 65536);
  SDL.DOMEventToSDLEvent["keydown"] = 768;
  SDL.DOMEventToSDLEvent["keyup"] = 769;
  SDL.DOMEventToSDLEvent["keypress"] = 771;
  SDL.DOMEventToSDLEvent["mousedown"] = 1025;
  SDL.DOMEventToSDLEvent["mouseup"] = 1026;
  SDL.DOMEventToSDLEvent["mousemove"] = 1024;
  SDL.DOMEventToSDLEvent["wheel"] = 1027;
  SDL.DOMEventToSDLEvent["touchstart"] = 1792;
  SDL.DOMEventToSDLEvent["touchend"] = 1793;
  SDL.DOMEventToSDLEvent["touchmove"] = 1794;
  SDL.DOMEventToSDLEvent["unload"] = 256;
  SDL.DOMEventToSDLEvent["resize"] = 28673;
  SDL.DOMEventToSDLEvent["visibilitychange"] = 512;
  SDL.DOMEventToSDLEvent["focus"] = 512;
  SDL.DOMEventToSDLEvent["blur"] = 512;
  SDL.DOMEventToSDLEvent["joystick_axis_motion"] = 1536;
  SDL.DOMEventToSDLEvent["joystick_button_down"] = 1539;
  SDL.DOMEventToSDLEvent["joystick_button_up"] = 1540;
  return 0;
}
function _SDL_PollEvent(ptr) {
  return SDL.pollEvent(ptr);
}
function __webgl_enable_ANGLE_instanced_arrays(ctx) {
  var ext = ctx.getExtension("ANGLE_instanced_arrays");
  if (ext) {
    ctx["vertexAttribDivisor"] = function (index, divisor) {
      ext["vertexAttribDivisorANGLE"](index, divisor);
    };
    ctx["drawArraysInstanced"] = function (mode, first, count, primcount) {
      ext["drawArraysInstancedANGLE"](mode, first, count, primcount);
    };
    ctx["drawElementsInstanced"] = function (
      mode,
      count,
      type,
      indices,
      primcount
    ) {
      ext["drawElementsInstancedANGLE"](mode, count, type, indices, primcount);
    };
    return 1;
  }
}
function __webgl_enable_OES_vertex_array_object(ctx) {
  var ext = ctx.getExtension("OES_vertex_array_object");
  if (ext) {
    ctx["createVertexArray"] = function () {
      return ext["createVertexArrayOES"]();
    };
    ctx["deleteVertexArray"] = function (vao) {
      ext["deleteVertexArrayOES"](vao);
    };
    ctx["bindVertexArray"] = function (vao) {
      ext["bindVertexArrayOES"](vao);
    };
    ctx["isVertexArray"] = function (vao) {
      return ext["isVertexArrayOES"](vao);
    };
    return 1;
  }
}
function __webgl_enable_WEBGL_draw_buffers(ctx) {
  var ext = ctx.getExtension("WEBGL_draw_buffers");
  if (ext) {
    ctx["drawBuffers"] = function (n, bufs) {
      ext["drawBuffersWEBGL"](n, bufs);
    };
    return 1;
  }
}
function __webgl_enable_WEBGL_multi_draw(ctx) {
  return !!(ctx.multiDrawWebgl = ctx.getExtension("WEBGL_multi_draw"));
}
var GL = {
  counter: 1,
  buffers: [],
  programs: [],
  framebuffers: [],
  renderbuffers: [],
  textures: [],
  uniforms: [],
  shaders: [],
  vaos: [],
  contexts: [],
  offscreenCanvases: {},
  timerQueriesEXT: [],
  programInfos: {},
  stringCache: {},
  unpackAlignment: 4,
  recordError: function recordError(errorCode) {
    if (!GL.lastError) {
      GL.lastError = errorCode;
    }
  },
  getNewId: function (table) {
    var ret = GL.counter++;
    for (var i = table.length; i < ret; i++) {
      table[i] = null;
    }
    return ret;
  },
  getSource: function (shader, count, string, length) {
    var source = "";
    for (var i = 0; i < count; ++i) {
      var len = length ? HEAP32[(length + i * 4) >> 2] : -1;
      source += UTF8ToString(
        HEAP32[(string + i * 4) >> 2],
        len < 0 ? undefined : len
      );
    }
    return source;
  },
  createContext: function (canvas, webGLContextAttributes) {
    var ctx = canvas.getContext("webgl", webGLContextAttributes);
    if (!ctx) return 0;
    var handle = GL.registerContext(ctx, webGLContextAttributes);
    return handle;
  },
  registerContext: function (ctx, webGLContextAttributes) {
    var handle = GL.getNewId(GL.contexts);
    var context = {
      handle: handle,
      attributes: webGLContextAttributes,
      version: webGLContextAttributes.majorVersion,
      GLctx: ctx,
    };
    if (ctx.canvas) ctx.canvas.GLctxObject = context;
    GL.contexts[handle] = context;
    if (
      typeof webGLContextAttributes.enableExtensionsByDefault === "undefined" ||
      webGLContextAttributes.enableExtensionsByDefault
    ) {
      GL.initExtensions(context);
    }
    return handle;
  },
  makeContextCurrent: function (contextHandle) {
    GL.currentContext = GL.contexts[contextHandle];
    Module.ctx = GLctx = GL.currentContext && GL.currentContext.GLctx;
    return !(contextHandle && !GLctx);
  },
  getContext: function (contextHandle) {
    return GL.contexts[contextHandle];
  },
  deleteContext: function (contextHandle) {
    if (GL.currentContext === GL.contexts[contextHandle])
      GL.currentContext = null;
    if (typeof JSEvents === "object")
      JSEvents.removeAllHandlersOnTarget(
        GL.contexts[contextHandle].GLctx.canvas
      );
    if (GL.contexts[contextHandle] && GL.contexts[contextHandle].GLctx.canvas)
      GL.contexts[contextHandle].GLctx.canvas.GLctxObject = undefined;
    GL.contexts[contextHandle] = null;
  },
  initExtensions: function (context) {
    if (!context) context = GL.currentContext;
    if (context.initExtensionsDone) return;
    context.initExtensionsDone = true;
    var GLctx = context.GLctx;
    __webgl_enable_ANGLE_instanced_arrays(GLctx);
    __webgl_enable_OES_vertex_array_object(GLctx);
    __webgl_enable_WEBGL_draw_buffers(GLctx);
    GLctx.disjointTimerQueryExt = GLctx.getExtension(
      "EXT_disjoint_timer_query"
    );
    __webgl_enable_WEBGL_multi_draw(GLctx);
    var automaticallyEnabledExtensions = [
      "OES_texture_float",
      "OES_texture_half_float",
      "OES_standard_derivatives",
      "OES_vertex_array_object",
      "WEBGL_compressed_texture_s3tc",
      "WEBGL_depth_texture",
      "OES_element_index_uint",
      "EXT_texture_filter_anisotropic",
      "EXT_frag_depth",
      "WEBGL_draw_buffers",
      "ANGLE_instanced_arrays",
      "OES_texture_float_linear",
      "OES_texture_half_float_linear",
      "EXT_blend_minmax",
      "EXT_shader_texture_lod",
      "EXT_texture_norm16",
      "WEBGL_compressed_texture_pvrtc",
      "EXT_color_buffer_half_float",
      "WEBGL_color_buffer_float",
      "EXT_sRGB",
      "WEBGL_compressed_texture_etc1",
      "EXT_disjoint_timer_query",
      "WEBGL_compressed_texture_etc",
      "WEBGL_compressed_texture_astc",
      "EXT_color_buffer_float",
      "WEBGL_compressed_texture_s3tc_srgb",
      "EXT_disjoint_timer_query_webgl2",
      "WEBKIT_WEBGL_compressed_texture_pvrtc",
    ];
    var exts = GLctx.getSupportedExtensions() || [];
    exts.forEach(function (ext) {
      if (automaticallyEnabledExtensions.indexOf(ext) != -1) {
        GLctx.getExtension(ext);
      }
    });
  },
  populateUniformTable: function (program) {
    var p = GL.programs[program];
    var ptable = (GL.programInfos[program] = {
      uniforms: {},
      maxUniformLength: 0,
      maxAttributeLength: -1,
      maxUniformBlockNameLength: -1,
    });
    var utable = ptable.uniforms;
    var numUniforms = GLctx.getProgramParameter(p, 35718);
    for (var i = 0; i < numUniforms; ++i) {
      var u = GLctx.getActiveUniform(p, i);
      var name = u.name;
      ptable.maxUniformLength = Math.max(
        ptable.maxUniformLength,
        name.length + 1
      );
      if (name.slice(-1) == "]") {
        name = name.slice(0, name.lastIndexOf("["));
      }
      var loc = GLctx.getUniformLocation(p, name);
      if (loc) {
        var id = GL.getNewId(GL.uniforms);
        utable[name] = [u.size, id];
        GL.uniforms[id] = loc;
        for (var j = 1; j < u.size; ++j) {
          var n = name + "[" + j + "]";
          loc = GLctx.getUniformLocation(p, n);
          id = GL.getNewId(GL.uniforms);
          GL.uniforms[id] = loc;
        }
      }
    }
  },
};
function _SDL_SetVideoMode(width, height, depth, flags) {
  [
    "touchstart",
    "touchend",
    "touchmove",
    "mousedown",
    "mouseup",
    "mousemove",
    "DOMMouseScroll",
    "mousewheel",
    "wheel",
    "mouseout",
  ].forEach(function (event) {
    Module["canvas"].addEventListener(event, SDL.receiveEvent, true);
  });
  var canvas = Module["canvas"];
  if (width == 0 && height == 0) {
    width = canvas.width;
    height = canvas.height;
  }
  if (!SDL.addedResizeListener) {
    SDL.addedResizeListener = true;
    Browser.resizeListeners.push(function (w, h) {
      if (!SDL.settingVideoMode) {
        SDL.receiveEvent({ type: "resize", w: w, h: h });
      }
    });
  }
  SDL.settingVideoMode = true;
  Browser.setCanvasSize(width, height);
  SDL.settingVideoMode = false;
  if (SDL.screen) {
    SDL.freeSurface(SDL.screen);
    assert(!SDL.screen);
  }
  if (SDL.GL) flags = flags | 67108864;
  SDL.screen = SDL.makeSurface(width, height, flags, true, "screen");
  return SDL.screen;
}
function _SDL_ShowCursor(toggle) {
  switch (toggle) {
    case 0:
      if (Browser.isFullscreen) {
        Module["canvas"].requestPointerLock();
        return 0;
      } else {
        return 1;
      }
      break;
    case 1:
      Module["canvas"].exitPointerLock();
      return 1;
      break;
    case -1:
      return !Browser.pointerLock;
      break;
    default:
      console.log(
        "SDL_ShowCursor called with unknown toggle parameter value: " +
          toggle +
          "."
      );
      break;
  }
}
function _SDL_WM_GrabInput() {}
function _SDL_WM_SetCaption(title, icon) {
  if (title && typeof setWindowTitle !== "undefined") {
    setWindowTitle(UTF8ToString(title));
  }
  icon = icon && UTF8ToString(icon);
}
function _tzset() {
  if (_tzset.called) return;
  _tzset.called = true;
  var currentYear = new Date().getFullYear();
  var winter = new Date(currentYear, 0, 1);
  var summer = new Date(currentYear, 6, 1);
  var winterOffset = winter.getTimezoneOffset();
  var summerOffset = summer.getTimezoneOffset();
  var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
  HEAP32[__get_timezone() >> 2] = stdTimezoneOffset * 60;
  HEAP32[__get_daylight() >> 2] = Number(winterOffset != summerOffset);
  function extractZone(date) {
    var match = date.toTimeString().match(/\(([A-Za-z ]+)\)$/);
    return match ? match[1] : "GMT";
  }
  var winterName = extractZone(winter);
  var summerName = extractZone(summer);
  var winterNamePtr = allocateUTF8(winterName);
  var summerNamePtr = allocateUTF8(summerName);
  if (summerOffset < winterOffset) {
    HEAP32[__get_tzname() >> 2] = winterNamePtr;
    HEAP32[(__get_tzname() + 4) >> 2] = summerNamePtr;
  } else {
    HEAP32[__get_tzname() >> 2] = summerNamePtr;
    HEAP32[(__get_tzname() + 4) >> 2] = winterNamePtr;
  }
}
function _localtime_r(time, tmPtr) {
  _tzset();
  var date = new Date(HEAP32[time >> 2] * 1e3);
  HEAP32[tmPtr >> 2] = date.getSeconds();
  HEAP32[(tmPtr + 4) >> 2] = date.getMinutes();
  HEAP32[(tmPtr + 8) >> 2] = date.getHours();
  HEAP32[(tmPtr + 12) >> 2] = date.getDate();
  HEAP32[(tmPtr + 16) >> 2] = date.getMonth();
  HEAP32[(tmPtr + 20) >> 2] = date.getFullYear() - 1900;
  HEAP32[(tmPtr + 24) >> 2] = date.getDay();
  var start = new Date(date.getFullYear(), 0, 1);
  var yday = ((date.getTime() - start.getTime()) / (1e3 * 60 * 60 * 24)) | 0;
  HEAP32[(tmPtr + 28) >> 2] = yday;
  HEAP32[(tmPtr + 36) >> 2] = -(date.getTimezoneOffset() * 60);
  var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  var winterOffset = start.getTimezoneOffset();
  var dst =
    (summerOffset != winterOffset &&
      date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0;
  HEAP32[(tmPtr + 32) >> 2] = dst;
  var zonePtr = HEAP32[(__get_tzname() + (dst ? 4 : 0)) >> 2];
  HEAP32[(tmPtr + 40) >> 2] = zonePtr;
  return tmPtr;
}
function ___localtime_r(a0, a1) {
  return _localtime_r(a0, a1);
}
function _abort() {
  abort();
}
function _emscripten_asm_const_int(code, sigPtr, argbuf) {
  var args = readAsmConstArgs(sigPtr, argbuf);
  return ASM_CONSTS[code].apply(null, args);
}
function _emscripten_memcpy_big(dest, src, num) {
  HEAPU8.copyWithin(dest, src, src + num);
}
function abortOnCannotGrowMemory(requestedSize) {
  abort("OOM");
}
function _emscripten_resize_heap(requestedSize) {
  requestedSize = requestedSize >>> 0;
  abortOnCannotGrowMemory(requestedSize);
}
function _exit(status) {
  exit(status);
}
var SYSCALLS = {
  mappings: {},
  buffers: [null, [], []],
  printChar: function (stream, curr) {
    var buffer = SYSCALLS.buffers[stream];
    if (curr === 0 || curr === 10) {
      (stream === 1 ? out : err)(UTF8ArrayToString(buffer, 0));
      buffer.length = 0;
    } else {
      buffer.push(curr);
    }
  },
  varargs: undefined,
  get: function () {
    SYSCALLS.varargs += 4;
    var ret = HEAP32[(SYSCALLS.varargs - 4) >> 2];
    return ret;
  },
  getStr: function (ptr) {
    var ret = UTF8ToString(ptr);
    return ret;
  },
  get64: function (low, high) {
    return low;
  },
};
function _fd_close(fd) {
  return 0;
}
function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {}
function _fd_write(fd, iov, iovcnt, pnum) {
  var num = 0;
  for (var i = 0; i < iovcnt; i++) {
    var ptr = HEAP32[(iov + i * 8) >> 2];
    var len = HEAP32[(iov + (i * 8 + 4)) >> 2];
    for (var j = 0; j < len; j++) {
      SYSCALLS.printChar(fd, HEAPU8[ptr + j]);
    }
    num += len;
  }
  HEAP32[pnum >> 2] = num;
  return 0;
}
function _mktime(tmPtr) {
  _tzset();
  var date = new Date(
    HEAP32[(tmPtr + 20) >> 2] + 1900,
    HEAP32[(tmPtr + 16) >> 2],
    HEAP32[(tmPtr + 12) >> 2],
    HEAP32[(tmPtr + 8) >> 2],
    HEAP32[(tmPtr + 4) >> 2],
    HEAP32[tmPtr >> 2],
    0
  );
  var dst = HEAP32[(tmPtr + 32) >> 2];
  var guessedOffset = date.getTimezoneOffset();
  var start = new Date(date.getFullYear(), 0, 1);
  var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  var winterOffset = start.getTimezoneOffset();
  var dstOffset = Math.min(winterOffset, summerOffset);
  if (dst < 0) {
    HEAP32[(tmPtr + 32) >> 2] = Number(
      summerOffset != winterOffset && dstOffset == guessedOffset
    );
  } else if (dst > 0 != (dstOffset == guessedOffset)) {
    var nonDstOffset = Math.max(winterOffset, summerOffset);
    var trueOffset = dst > 0 ? dstOffset : nonDstOffset;
    date.setTime(date.getTime() + (trueOffset - guessedOffset) * 6e4);
  }
  HEAP32[(tmPtr + 24) >> 2] = date.getDay();
  var yday = ((date.getTime() - start.getTime()) / (1e3 * 60 * 60 * 24)) | 0;
  HEAP32[(tmPtr + 28) >> 2] = yday;
  HEAP32[tmPtr >> 2] = date.getSeconds();
  HEAP32[(tmPtr + 4) >> 2] = date.getMinutes();
  HEAP32[(tmPtr + 8) >> 2] = date.getHours();
  HEAP32[(tmPtr + 12) >> 2] = date.getDate();
  HEAP32[(tmPtr + 16) >> 2] = date.getMonth();
  return (date.getTime() / 1e3) | 0;
}
function _time(ptr) {
  var ret = (Date.now() / 1e3) | 0;
  if (ptr) {
    HEAP32[ptr >> 2] = ret;
  }
  return ret;
}
var readAsmConstArgsArray = [];
function readAsmConstArgs(sigPtr, buf) {
  readAsmConstArgsArray.length = 0;
  var ch;
  buf >>= 2;
  while ((ch = HEAPU8[sigPtr++])) {
    var double = ch < 105;
    if (double && buf & 1) buf++;
    readAsmConstArgsArray.push(double ? HEAPF64[buf++ >> 1] : HEAP32[buf]);
    ++buf;
  }
  return readAsmConstArgsArray;
}
Module["requestFullscreen"] = function Module_requestFullscreen(
  lockPointer,
  resizeCanvas
) {
  Browser.requestFullscreen(lockPointer, resizeCanvas);
};
Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) {
  Browser.requestAnimationFrame(func);
};
Module["setCanvasSize"] = function Module_setCanvasSize(
  width,
  height,
  noUpdates
) {
  Browser.setCanvasSize(width, height, noUpdates);
};
Module["pauseMainLoop"] = function Module_pauseMainLoop() {
  Browser.mainLoop.pause();
};
Module["resumeMainLoop"] = function Module_resumeMainLoop() {
  Browser.mainLoop.resume();
};
Module["getUserMedia"] = function Module_getUserMedia() {
  Browser.getUserMedia();
};
Module["createContext"] = function Module_createContext(
  canvas,
  useWebGL,
  setInModule,
  webGLContextAttributes
) {
  return Browser.createContext(
    canvas,
    useWebGL,
    setInModule,
    webGLContextAttributes
  );
};
var GLctx;
function intArrayFromString(stringy, dontAddNull, length) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
}
__ATINIT__.push({
  func: function () {
    ___wasm_call_ctors();
  },
});
var asmLibraryArg = {
  l: _SDL_Init,
  i: _SDL_PollEvent,
  g: _SDL_SetVideoMode,
  e: _SDL_ShowCursor,
  f: _SDL_WM_GrabInput,
  d: _SDL_WM_SetCaption,
  p: ___localtime_r,
  b: _abort,
  c: _emscripten_asm_const_int,
  n: _emscripten_memcpy_big,
  o: _emscripten_resize_heap,
  h: _exit,
  q: _fd_close,
  m: _fd_seek,
  j: _fd_write,
  a: wasmMemory,
  r: _mktime,
  k: _time,
};
var asm = createWasm();
var ___wasm_call_ctors = (Module["___wasm_call_ctors"] = function () {
  return (___wasm_call_ctors = Module["___wasm_call_ctors"] =
    Module["asm"]["t"]).apply(null, arguments);
});
var _malloc = (Module["_malloc"] = function () {
  return (_malloc = Module["_malloc"] = Module["asm"]["u"]).apply(
    null,
    arguments
  );
});
var _free = (Module["_free"] = function () {
  return (_free = Module["_free"] = Module["asm"]["v"]).apply(null, arguments);
});
var _memcpy = (Module["_memcpy"] = function () {
  return (_memcpy = Module["_memcpy"] = Module["asm"]["w"]).apply(
    null,
    arguments
  );
});
var _memset = (Module["_memset"] = function () {
  return (_memset = Module["_memset"] = Module["asm"]["x"]).apply(
    null,
    arguments
  );
});
var _display_send_ctrl_alt_del = (Module["_display_send_ctrl_alt_del"] =
  function () {
    return (_display_send_ctrl_alt_del = Module["_display_send_ctrl_alt_del"] =
      Module["asm"]["y"]).apply(null, arguments);
  });
var _display_send_scancode = (Module["_display_send_scancode"] = function () {
  return (_display_send_scancode = Module["_display_send_scancode"] =
    Module["asm"]["z"]).apply(null, arguments);
});
var _drive_emscripten_init = (Module["_drive_emscripten_init"] = function () {
  return (_drive_emscripten_init = Module["_drive_emscripten_init"] =
    Module["asm"]["A"]).apply(null, arguments);
});
var _emscripten_alloc = (Module["_emscripten_alloc"] = function () {
  return (_emscripten_alloc = Module["_emscripten_alloc"] =
    Module["asm"]["B"]).apply(null, arguments);
});
var _emscripten_get_pc_config = (Module["_emscripten_get_pc_config"] =
  function () {
    return (_emscripten_get_pc_config = Module["_emscripten_get_pc_config"] =
      Module["asm"]["C"]).apply(null, arguments);
  });
var _emscripten_init = (Module["_emscripten_init"] = function () {
  return (_emscripten_init = Module["_emscripten_init"] =
    Module["asm"]["D"]).apply(null, arguments);
});
var _emscripten_run = (Module["_emscripten_run"] = function () {
  return (_emscripten_run = Module["_emscripten_run"] =
    Module["asm"]["E"]).apply(null, arguments);
});
var _emscripten_vga_update = (Module["_emscripten_vga_update"] = function () {
  return (_emscripten_vga_update = Module["_emscripten_vga_update"] =
    Module["asm"]["F"]).apply(null, arguments);
});
var _emscripten_debug = (Module["_emscripten_debug"] = function () {
  return (_emscripten_debug = Module["_emscripten_debug"] =
    Module["asm"]["G"]).apply(null, arguments);
});
var _emscripten_savestate = (Module["_emscripten_savestate"] = function () {
  return (_emscripten_savestate = Module["_emscripten_savestate"] =
    Module["asm"]["H"]).apply(null, arguments);
});
var _emscripten_get_cycles = (Module["_emscripten_get_cycles"] = function () {
  return (_emscripten_get_cycles = Module["_emscripten_get_cycles"] =
    Module["asm"]["I"]).apply(null, arguments);
});
var _emscripten_get_now = (Module["_emscripten_get_now"] = function () {
  return (_emscripten_get_now = Module["_emscripten_get_now"] =
    Module["asm"]["J"]).apply(null, arguments);
});
var _emscripten_set_fast = (Module["_emscripten_set_fast"] = function () {
  return (_emscripten_set_fast = Module["_emscripten_set_fast"] =
    Module["asm"]["K"]).apply(null, arguments);
});
var _emscripten_dyncall_vii = (Module["_emscripten_dyncall_vii"] = function () {
  return (_emscripten_dyncall_vii = Module["_emscripten_dyncall_vii"] =
    Module["asm"]["L"]).apply(null, arguments);
});
var _main = (Module["_main"] = function () {
  return (_main = Module["_main"] = Module["asm"]["M"]).apply(null, arguments);
});
var _parse_cfg = (Module["_parse_cfg"] = function () {
  return (_parse_cfg = Module["_parse_cfg"] = Module["asm"]["N"]).apply(
    null,
    arguments
  );
});
var __get_tzname = (Module["__get_tzname"] = function () {
  return (__get_tzname = Module["__get_tzname"] = Module["asm"]["O"]).apply(
    null,
    arguments
  );
});
var __get_daylight = (Module["__get_daylight"] = function () {
  return (__get_daylight = Module["__get_daylight"] = Module["asm"]["P"]).apply(
    null,
    arguments
  );
});
var __get_timezone = (Module["__get_timezone"] = function () {
  return (__get_timezone = Module["__get_timezone"] = Module["asm"]["Q"]).apply(
    null,
    arguments
  );
});
var calledRun;
function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
}
var calledMain = false;
dependenciesFulfilled = function runCaller() {
  if (!calledRun) run();
  if (!calledRun) dependenciesFulfilled = runCaller;
};
function callMain(args) {
  var entryFunction = Module["_main"];
  var argc = 0;
  var argv = 0;
  try {
    var ret = entryFunction(argc, argv);
    exit(ret, true);
  } catch (e) {
    if (e instanceof ExitStatus) {
      return;
    } else if (e == "unwind") {
      noExitRuntime = true;
      return;
    } else {
      var toLog = e;
      if (e && typeof e === "object" && e.stack) {
        toLog = [e, e.stack];
      }
      err("exception thrown: " + toLog);
      quit_(1, e);
    }
  } finally {
    calledMain = true;
  }
}
function run(args) {
  args = args || arguments_;
  if (runDependencies > 0) {
    return;
  }
  preRun();
  if (runDependencies > 0) return;
  function doRun() {
    if (calledRun) return;
    calledRun = true;
    Module["calledRun"] = true;
    if (ABORT) return;
    initRuntime();
    preMain();
    if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
    if (shouldRunNow) callMain(args);
    postRun();
  }
  if (Module["setStatus"]) {
    Module["setStatus"]("Running...");
    setTimeout(function () {
      setTimeout(function () {
        Module["setStatus"]("");
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module["run"] = run;
function exit(status, implicit) {
  if (implicit && noExitRuntime && status === 0) {
    return;
  }
  if (noExitRuntime) {
  } else {
    EXITSTATUS = status;
    exitRuntime();
    if (Module["onExit"]) Module["onExit"](status);
    ABORT = true;
  }
  quit_(status, new ExitStatus(status));
}
if (Module["preInit"]) {
  if (typeof Module["preInit"] == "function")
    Module["preInit"] = [Module["preInit"]];
  while (Module["preInit"].length > 0) {
    Module["preInit"].pop()();
  }
}
var shouldRunNow = true;
if (Module["noInitialRun"]) shouldRunNow = false;
noExitRuntime = true;
run();
