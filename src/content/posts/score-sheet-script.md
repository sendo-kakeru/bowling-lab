---
title: スコアの計算を書いてみた
publishedAt: 2026-10-04
---

ボウリングのスコアの数え方は、ストライクとスペアのボーナスがあって少しややこしい。理解を確かめるために、計算を書いてみた。

```ts
function score(rolls: number[]): number {
	let total = 0;
	let i = 0;
	for (let frame = 0; frame < 10; frame++) {
		if (rolls[i] === 10) {
			total += 10 + rolls[i + 1] + rolls[i + 2];
			i += 1;
		} else if (rolls[i] + rolls[i + 1] === 10) {
			total += 10 + rolls[i + 2];
			i += 2;
		} else {
			total += rolls[i] + rolls[i + 1];
			i += 2;
		}
	}
	return total;
}
```

ストライクは次の 2 投、スペアは次の 1 投をボーナスとして足す。10 フレーム目は、ストライクかスペアなら 3 投目まで投げられる。

| 投げ方 | スコア |
| --- | --- |
| 全部ガター | 0 |
| 全部 1 本 | 20 |
| 全部スペア（5 本ずつ） | 150 |
| 全部ストライク | 300 |

全部スペアで 150 になるのは、自分で計算してみるまで知らなかった。`9` と `/` をずっと続けても 190 にしかならない。
