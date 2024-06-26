import {test} from '../../util/test.js';
import {Aabb, Frustum, Ray} from '../../../src/util/primitives.js';
import {mat4, vec3} from 'gl-matrix';
import {fixedVec3} from '../../util/fixed.js';

test('primitives', (t) => {
    t.test('aabb', (t) => {
        t.test('Create an aabb', (t) => {
            const min = vec3.fromValues(0, 0, 0);
            const max = vec3.fromValues(2, 4, 6);
            const aabb = new Aabb(min, max);

            t.equal(aabb.min, min);
            t.equal(aabb.max, max);
            t.deepEqual(aabb.center, vec3.fromValues(1, 2, 3));
            t.end();
        });

        t.test('Create an aabb from points', (t) => {
            const p0 = vec3.fromValues(-10, 20, 30);
            const p1 = vec3.fromValues(10, -30, 50);
            const p2 = vec3.fromValues(50, 10, -100);
            const p3 = vec3.fromValues(-15, 5, 120);
            const aabb = Aabb.fromPoints([p0, p1, p2, p3]);

            t.deepEqual(aabb.min, vec3.fromValues(-15, -30, -100));
            t.deepEqual(aabb.max, vec3.fromValues(50, 20, 120));
            t.deepEqual(aabb.center, vec3.fromValues(17.5, -5, 10));
            t.end();
        });

        t.test('Create 4 quadrants', (t) => {
            const min = vec3.fromValues(0, 0, 0);
            const max = vec3.fromValues(2, 4, 1);
            const aabb = new Aabb(min, max);

            t.deepEqual(aabb.quadrant(0), new Aabb(vec3.fromValues(0, 0, 0), vec3.fromValues(1, 2, 1)));
            t.deepEqual(aabb.quadrant(1), new Aabb(vec3.fromValues(1, 0, 0), vec3.fromValues(2, 2, 1)));
            t.deepEqual(aabb.quadrant(2), new Aabb(vec3.fromValues(0, 2, 0), vec3.fromValues(1, 4, 1)));
            t.deepEqual(aabb.quadrant(3), new Aabb(vec3.fromValues(1, 2, 0), vec3.fromValues(2, 4, 1)));

            t.end();
        });

        t.test('Distance to a point', (t) => {
            const min = vec3.fromValues(-1, -1, -1);
            const max = vec3.fromValues(1, 1, 1);
            const aabb = new Aabb(min, max);

            t.equal(aabb.distanceX([0.5, -0.5]), 0);
            t.equal(aabb.distanceY([0.5, -0.5]), 0);

            t.equal(aabb.distanceX([1, 1]), 0);
            t.equal(aabb.distanceY([1, 1]), 0);

            t.equal(aabb.distanceX([0, 10]), 0);
            t.equal(aabb.distanceY([0, 10]), -9);

            t.equal(aabb.distanceX([-2, -2]), 1);
            t.equal(aabb.distanceY([-2, -2]), 1);
            t.end();
        });

        const createTestCameraFrustum = (fovy, aspectRatio, zNear, zFar, elevation, rotation) => {
            const proj = new Float64Array(16);
            const invProj = new Float64Array(16);
            // Note that left handed coordinate space is used where z goes towards the sky.
            // Y has to be flipped as well because it's part of the projection/camera matrix used in transform.js
            mat4.perspective(proj, fovy, aspectRatio, zNear, zFar);
            mat4.scale(proj, proj, [1, -1, 1]);
            mat4.translate(proj, proj, [0, 0, elevation]);
            mat4.rotateZ(proj, proj, rotation);
            mat4.invert(invProj, proj);

            return Frustum.fromInvProjectionMatrix(invProj, 1.0, 0.0);
        };

        t.test('Aabb fully inside a frustum', (t) => {
            const frustum = createTestCameraFrustum(Math.PI / 2, 1.0, 0.1, 100.0, -5, 0);

            // Intersection test is done in xy-plane
            const aabbList = [
                new Aabb(vec3.fromValues(-1, -1, 0), vec3.fromValues(1, 1, 0)),
                new Aabb(vec3.fromValues(-5, -5, 0), vec3.fromValues(5, 5, 0)),
                new Aabb(vec3.fromValues(-5, -5, 0), vec3.fromValues(-4, -2, 0))
            ];

            for (const aabb of aabbList)
                t.equal(aabb.intersects(frustum), 2);

            t.end();
        });

        t.test('Aabb intersecting with a frustum', (t) => {
            const frustum = createTestCameraFrustum(Math.PI / 2, 1.0, 0.1, 100.0, -5, 0);

            const aabbList = [
                new Aabb(vec3.fromValues(-6, -6, 0), vec3.fromValues(6, 6, 0)),
                new Aabb(vec3.fromValues(-6, -6, 0), vec3.fromValues(-5, -5, 0))
            ];

            for (const aabb of aabbList)
                t.equal(aabb.intersects(frustum), 1);

            t.end();
        });

        t.test('Aabb conservative intersection with a frustum', (t) => {
            const frustum = createTestCameraFrustum(Math.PI / 2, 1.0, 0.1, 100.0, -5, Math.PI / 4);
            const aabb = new Aabb(vec3.fromValues(-10, 10, 0), vec3.fromValues(10, 12, 0));

            // Intersection test should report intersection even though shapes are separate
            t.equal(aabb.intersects(frustum), 1);
            t.equal(aabb.intersectsPrecise(frustum), 0);

            t.end();
        });

        t.test('No intersection between aabb and frustum', (t) => {
            const frustum = createTestCameraFrustum(Math.PI / 2, 1.0, 0.1, 100.0, -5);

            const aabbList = [
                new Aabb(vec3.fromValues(-6, 0, 0), vec3.fromValues(-5.5, 0, 0)),
                new Aabb(vec3.fromValues(-6, -6, 0), vec3.fromValues(-5.5, -5.5, 0)),
                new Aabb(vec3.fromValues(7, -10, 0), vec3.fromValues(7.1, 20, 0))
            ];

            for (const aabb of aabbList)
                t.equal(aabb.intersects(frustum), 0);

            t.end();
        });

        t.end();
    });

    t.test('frustum', (t) => {
        t.test('Create a frustum from inverse projection matrix', (t) => {
            const proj = new Float64Array(16);
            const invProj = new Float64Array(16);
            mat4.perspective(proj, Math.PI / 2, 1.0, 0.1, 100.0);
            mat4.invert(invProj, proj);

            const frustum = Frustum.fromInvProjectionMatrix(invProj, 1.0, 0.0);

            // mat4.perspective generates a projection matrix for right handed coordinate space.
            // This means that forward direction will be -z
            const expectedFrustumPoints = [
                [-0.1, 0.1, -0.1],
                [0.1, 0.1, -0.1],
                [0.1, -0.1, -0.1],
                [-0.1, -0.1, -0.1],
                [-100.0, 100.0, -100.0],
                [100.0, 100.0, -100.0],
                [100.0, -100.0, -100.0],
                [-100.0, -100.0, -100.0],
            ];

            // Round numbers to mitigate the precision loss
            frustum.points = frustum.points.map(array => array.map(n => Math.round(n * 10) / 10));
            frustum.planes = frustum.planes.map(array => array.map(n => Math.round(n * 1000) / 1000));

            const expectedFrustumPlanes = [
                [0, 0, 1.0, 0.1],
                [0, 0, -1.0, -100.0],
                [-0.707, 0, 0.707, 0],
                [0.707, 0, 0.707, 0],
                [0, -0.707, 0.707, 0],
                [0, 0.707, 0.707, 0]
            ];

            t.deepEqual(frustum.points, expectedFrustumPoints);
            t.deepEqual(frustum.planes, expectedFrustumPlanes);
            t.end();
        });
        t.end();
    });

    t.test('ray', (t) => {
        t.test('intersectsPlane', (t) => {
            t.test('parallel', (t) => {
                const r = new Ray(vec3.fromValues(0, 0, 1), vec3.fromValues(1, 1, 0));
                t.notOk(r.intersectsPlane(vec3.fromValues(0, 0, 0), vec3.fromValues(0, 0, 1), vec3.create()));
                t.end();
            });

            t.test('orthogonal', (t) => {
                const r = new Ray(vec3.fromValues(10, 20, 50), vec3.fromValues(0, 0, -1));
                const out = vec3.create();
                t.ok(r.intersectsPlane(vec3.fromValues(0, 0, 5), vec3.fromValues(0, 0, 1), out));
                assertAlmostEqual(t, out[0], 10);
                assertAlmostEqual(t, out[1], 20);
                assertAlmostEqual(t, out[2], 5);
                t.end();
            });

            t.test('angled down', (t) => {
                const r = new Ray(vec3.fromValues(-10, -10, 20), vec3.fromValues(0.5773, 0.5773, -0.5773));
                const out = vec3.create();
                t.ok(r.intersectsPlane(vec3.fromValues(0, 0, 10), vec3.fromValues(0, 0, 1), out));
                assertAlmostEqual(t, out[0], 0);
                assertAlmostEqual(t, out[1], 0);
                assertAlmostEqual(t, out[2], 10);
                t.end();
            });

            t.test('angled up', (t) => {
                const r = new Ray(vec3.fromValues(-10, -10, 20), vec3.fromValues(0.5773, 0.5773, 0.5773));
                const out = vec3.create();
                t.ok(r.intersectsPlane(vec3.fromValues(0, 0, 10), vec3.fromValues(0, 0, 1), out));
                assertAlmostEqual(t, out[0], -20);
                assertAlmostEqual(t, out[1], -20);
                assertAlmostEqual(t, out[2], 10);
                t.end();
            });

            t.end();
        });

        t.test('closestPointOnSphere', (t) => {
            t.test('intersection', (t) => {
                const r = new Ray(vec3.fromValues(0, 0, 5), vec3.fromValues(0, 0, -1));

                const point = vec3.fromValues(0, 0, 0);
                let intersection = r.closestPointOnSphere(vec3.fromValues(0, 0, 0), 1.0, point);
                t.ok(intersection);
                t.same(vec3.fromValues(0, 0, 1), point);

                r.pos = vec3.fromValues(0.8, 0.0, 100000.0);
                intersection = r.closestPointOnSphere(vec3.fromValues(0, 0, 0), 1.0, point);
                t.ok(intersection);
                t.same(vec3.fromValues(0.8, 0, 0.60000050), point);

                r.pos = vec3.fromValues(1, 1, 1);
                r.dir = vec3.normalize([], vec3.fromValues(-1, -1, -1));
                intersection = r.closestPointOnSphere(vec3.fromValues(0, 0, 0), 1.0, point);
                t.ok(intersection);
                t.same(vec3.fromValues(0.57735026, 0.57735026, 0.57735026), point);

                t.end();
            });

            t.test('away', (t) => {
                const r = new Ray(vec3.fromValues(0, 0, 5), vec3.fromValues(0, 0, 1));

                const point = vec3.fromValues(0, 0, 0);
                const intersection = r.closestPointOnSphere(vec3.fromValues(0, 0, 0), 4.99, point);
                t.notOk(intersection);
                t.same(fixedVec3(vec3.fromValues(0, 0, 4.99), 2), fixedVec3(point, 2));

                t.end();
            });

            t.test('no intersection', (t) => {
                const r = new Ray(vec3.fromValues(0, 0, 5), vec3.fromValues(0, 0, -1));

                const point = vec3.fromValues(0, 0, 0);
                const intersection = r.closestPointOnSphere(vec3.fromValues(2, 0, 0), 1, point);
                t.notOk(intersection);
                t.same(vec3.fromValues(-1, 0, 0), point);

                t.end();
            });

            t.test('inside', (t) => {
                const r = new Ray(vec3.fromValues(0.5, 0.1, 0), vec3.fromValues(1, 0, 1));

                const point = vec3.fromValues(0, 0, 0);
                const intersection = r.closestPointOnSphere(vec3.fromValues(0, 0, 0), 1, point);
                t.notOk(intersection);
                t.same(fixedVec3(vec3.fromValues(0.98058, 0.19612, 0), 5), fixedVec3(point, 5));

                t.end();
            });

            t.test('zero radius', (t) => {
                const r = new Ray(vec3.fromValues(1.0, 0.0, 3.0), vec3.fromValues(0, 0, -1));

                const point = vec3.fromValues(0, 0, 0);
                let intersection = r.closestPointOnSphere(vec3.fromValues(0, 0, 0), 0, point);
                t.notOk(intersection);
                t.same(vec3.fromValues(0, 0, 0), point);

                intersection = r.closestPointOnSphere(vec3.fromValues(1.0, 0, 0), 0, point);
                t.notOk(intersection);
                t.same(vec3.fromValues(0, 0, 0), point);

                t.end();
            });

            t.test('point at sphere center', (t) => {
                const r = new Ray(vec3.fromValues(0.5, 2, 0), vec3.fromValues(1, 0, 0));

                const point = vec3.fromValues(0, 0, 0);
                const intersection = r.closestPointOnSphere(vec3.fromValues(0.5, 2.0, 0), 3.0, point);
                t.notOk(intersection);
                t.same(vec3.fromValues(0, 0, 0), point);

                t.end();
            });

            t.test('point at surface', (t) => {
                const r = new Ray(vec3.fromValues(1, 0, 0), vec3.fromValues(0, 0, 1));

                const point = vec3.fromValues(0, 0, 0);
                const intersection = r.closestPointOnSphere(vec3.fromValues(0, 0, 0), 1, point);
                t.ok(intersection);
                t.same(vec3.fromValues(1, 0, 0), point);

                t.end();
            });

            t.end();
        });

        t.end();
    });
    t.end();
});

function assertAlmostEqual(t, actual, expected, epsilon = 1e-6) {
    t.ok(Math.abs(actual - expected) < epsilon);
}
