const crypto = require('crypto');
const { readdir, readFile } = require('node:fs/promises');
const path = require('path');
const contentVer = '2';
const indexV = '5';

function bucketDir(cache) {
  return path.join(cache, `index-v${indexV}`);
}

function contentDir(cache) {
  return path.join(cache, `content-v${contentVer}`);
}

// 解析路径
function lsStream(cache) {
  const indexDir = bucketDir(cache);

  return new Promise(async (resolve, reject) => {
    const buckets = await readdirOrEmpty(indexDir);
    const cachePaths = [];
    await Promise.all(
      buckets.map(async (bucket) => {
        const bucketPath = path.join(indexDir, bucket);
        const subbuckets = await readdirOrEmpty(bucketPath);
        await Promise.all(
          subbuckets.map(async (subbucket) => {
            const subbucketPath = path.join(bucketPath, subbucket);

            // "/cachename/<bucket 0xFF>/<bucket 0xFF>./*"
            const subbucketEntries = await readdirOrEmpty(subbucketPath);
            await Promise.all(
              subbucketEntries.map(async (entry) => {
                const entryPath = path.join(subbucketPath, entry);
                try {
                  const entries = await bucketEntries(entryPath);
                  // using a Map here prevents duplicate keys from showing up
                  // twice, I guess?
                  const reduced = entries.reduce((acc, entry) => {
                    acc.set(entry.key, entry);
                    return acc;
                  }, new Map());
                  // reduced is a map of key => entry
                  for (const entry of reduced.values()) {
                    const formatted = formatEntry(cache, entry);
                    if (formatted) {
                      cachePaths.push(formatted);
                    }
                  }
                } catch (err) {
                  if (err.code === 'ENOENT') {
                    return undefined;
                  }
                  throw err;
                }
              })
            );
          })
        );
      })
    );

    resolve(cachePaths);
  });

  // Set all this up to run on the stream and then just return the stream
  Promise.resolve()
    .then(async () => {
      const buckets = await readdirOrEmpty(indexDir);
      await Promise.all(
        buckets.map(async (bucket) => {
          const bucketPath = path.join(indexDir, bucket);
          const subbuckets = await readdirOrEmpty(bucketPath);
          await Promise.all(
            subbuckets.map(async (subbucket) => {
              const subbucketPath = path.join(bucketPath, subbucket);

              // "/cachename/<bucket 0xFF>/<bucket 0xFF>./*"
              const subbucketEntries = await readdirOrEmpty(subbucketPath);
              await Promise.all(
                subbucketEntries.map(async (entry) => {
                  const entryPath = path.join(subbucketPath, entry);
                  try {
                    const entries = await bucketEntries(entryPath);
                    // using a Map here prevents duplicate keys from showing up
                    // twice, I guess?
                    const reduced = entries.reduce((acc, entry) => {
                      acc.set(entry.key, entry);
                      return acc;
                    }, new Map());
                    // reduced is a map of key => entry
                    for (const entry of reduced.values()) {
                      const formatted = formatEntry(cache, entry);
                      if (formatted) {
                        return formatted;
                      }
                    }
                  } catch (err) {
                    if (err.code === 'ENOENT') {
                      return undefined;
                    }
                    throw err;
                  }
                })
              );
            })
          );
        })
      );
    })
    .catch((err) => {
      console.log('解析缓存路径失败！！！！', err);
    });
}

async function ls(cache) {
  const entries = await lsStream(cache);
  return entries.reduce((acc, xs) => {
    acc[xs.key] = xs;
    return acc;
  }, {});
}

module.exports.ls = ls;

function readdirOrEmpty(dir) {
  return readdir(dir).catch((err) => {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') {
      return [];
    }

    throw err;
  });
}

async function bucketEntries(bucket, filter) {
  const data = await readFile(bucket, 'utf-8');
  return _bucketEntries(data, filter);
}

function _bucketEntries(data, filter) {
  const entries = [];
  data.split('\n').forEach((entry) => {
    if (!entry) {
      return;
    }

    const pieces = entry.split('\t');
    if (!pieces[1] || hashEntry(pieces[1]) !== pieces[0]) {
      // Hash is no good! Corruption or malice? Doesn't matter!
      // EJECT EJECT
      return;
    }
    let obj;
    try {
      obj = JSON.parse(pieces[1]);
    } catch (e) {
      // Entry is corrupted!
      return;
    }
    if (obj) {
      entries.push(obj);
    }
  });
  return entries;
}

function hashEntry(str) {
  return hash(str, 'sha1');
}

function hash(str, digest) {
  return crypto.createHash(digest).update(str).digest('hex');
}

function formatEntry(cache, entry, keepAll) {
  // Treat null digests as deletions. They'll shadow any previous entries.
  if (!entry.integrity && !keepAll) {
    return null;
  }

  return {
    key: entry.key,
    integrity: entry.integrity,
    path: entry.integrity ? contentPath(cache, entry.integrity) : undefined,
    size: entry.size,
    time: entry.time,
    metadata: entry.metadata
  };
}

function contentPath(cache, integrity) {
  const [algorithm, digest] = integrity.split('-');

  return path.join(
    contentDir(cache),
    algorithm,
    ...hashToSegments(hexDigest(digest))
  );
}

function hexDigest(digest) {
  return digest && Buffer.from(digest, 'base64').toString('hex');
}

function hashToSegments(hash) {
  return [hash.slice(0, 2), hash.slice(2, 4), hash.slice(4)];
}
