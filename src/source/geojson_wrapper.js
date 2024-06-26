// @flow

import Point from '@mapbox/point-geometry';

import {VectorTileFeature} from '@mapbox/vector-tile';
// $FlowFixMe[method-unbinding]
const toGeoJSON = VectorTileFeature.prototype.toGeoJSON;
import EXTENT from '../style-spec/data/extent.js';

import type {GeoJSONFeature} from '@mapbox/geojson-types';
import type {IVectorTile, IVectorTileLayer, IVectorTileFeature} from '@mapbox/vector-tile';

// The feature type used by geojson-vt and supercluster. Should be extracted to
// global type and used in module definitions for those two modules.
type Feature = {
    type: 1,
    id: mixed,
    tags: {[_: string]: string | number | boolean},
    geometry: Array<[number, number]>,
} | {
    type: 2 | 3,
    id: mixed,
    tags: {[_: string]: string | number | boolean},
    geometry: Array<Array<[number, number]>>,
}

class FeatureWrapper implements IVectorTileFeature {
    _feature: Feature;

    extent: number;
    type: 1 | 2 | 3;
    id: number;
    properties: {[_: string]: string | number | boolean};

    constructor(feature: Feature) {
        this._feature = feature;

        this.extent = EXTENT;
        this.type = feature.type;
        this.properties = feature.tags;

        // If the feature has a top-level `id` property, copy it over, but only
        // if it can be coerced to an integer, because this wrapper is used for
        // serializing geojson feature data into vector tile PBF data, and the
        // vector tile spec only supports integer values for feature ids --
        // allowing non-integer values here results in a non-compliant PBF
        // that causes an exception when it is parsed with vector-tile-js
        if ('id' in feature && !isNaN(feature.id)) {
            this.id = parseInt(feature.id, 10);
        }
    }

    loadGeometry(): Array<Array<Point>> {
        if (this._feature.type === 1) {
            const geometry = [];
            for (const point of this._feature.geometry) {
                geometry.push([new Point(point[0], point[1])]);
            }
            return geometry;
        } else {
            const geometry = [];
            for (const ring of this._feature.geometry) {
                const newRing = [];
                for (const point of ring) {
                    newRing.push(new Point(point[0], point[1]));
                }
                geometry.push(newRing);
            }
            return geometry;
        }
    }

    toGeoJSON(x: number, y: number, z: number): GeoJSONFeature {
        return toGeoJSON.call(this, x, y, z);
    }
}

class GeoJSONWrapper implements IVectorTile, IVectorTileLayer {
    layers: {[_: string]: IVectorTileLayer};
    name: string;
    extent: number;
    length: number;
    _features: Array<Feature>;

    constructor(features: Array<Feature>) {
        this.layers = {'_geojsonTileLayer': this};
        this.name = '_geojsonTileLayer';
        this.extent = EXTENT;
        this.length = features.length;
        this._features = features;
    }

    feature(i: number): IVectorTileFeature {
        return new FeatureWrapper(this._features[i]);
    }
}

export default GeoJSONWrapper;
