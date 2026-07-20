/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type VideoSource = 'local' | 'youtube';

export type ProcessingStatus =
  | 'idle'
  | 'preparing'
  | 'recording'
  | 'finalizing'
  | 'completed'
  | 'error';

export interface TrimConfig {
  startTime: number;
  endTime: number;
  speed: number;
}

export interface VideoStats {
  duration: number;
  width: number;
  height: number;
  name: string;
  size: number;
}
