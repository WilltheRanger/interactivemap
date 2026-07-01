-- Real teacher/room reference data — replaces the placeholder buildings/rooms/teachers.
-- Generated from 202526_Teacher_Rooms.xlsx (teacher → room roster).
-- Room ids that match a campus SVG shape are tappable on the map; others (e.g. 1101) are
-- schedule-only. Rooms with an unknown teacher in the sheet are created with a null teacher;
-- PE coaches have no room. Idempotent (upserts).

-- Real teacher/room reference data (from 202526_Teacher_Rooms.xlsx).

-- Buildings
insert into buildings (id, label, level) values
  ('bldg-200', '200s Building', 0),
  ('bldg-300', '300s Building', 0),
  ('bldg-400', '400s Building', 0),
  ('bldg-500', '500s Building', 0),
  ('bldg-600', '600s Building', 0),
  ('bldg-900', '900s — Theater & Arts', 0),
  ('bldg-1100', '1100s Building', 0)
on conflict (id) do update set label = excluded.label;

-- Teachers (home_room set after rooms exist)
insert into teachers (id, name, home_room_id) values
  ('mr-hwang', 'Mr. Hwang', null),
  ('ms-chan', 'Ms. Chan', null),
  ('ms-tran', 'Ms. Tran', null),
  ('ms-mesdjian', 'Ms. Mesdjian', null),
  ('mr-holbert', 'Mr. Holbert', null),
  ('ms-delgado', 'Ms. Delgado', null),
  ('ms-hostetler', 'Ms. Hostetler', null),
  ('mr-mesdjian', 'Mr. Mesdjian', null),
  ('ms-newman', 'Ms. Newman', null),
  ('ms-buhain', 'Ms. Buhain', null),
  ('mr-enriquez', 'Mr. Enriquez', null),
  ('ms-van-horn', 'Ms. Van Horn', null),
  ('ms-zavala', 'Ms. Zavala', null),
  ('mr-navarro', 'Mr. Navarro', null),
  ('mr-wu', 'Mr. Wu', null),
  ('ms-lu', 'Ms. Lu', null),
  ('ms-lee', 'Ms. Lee', null),
  ('ms-collier', 'Ms. Collier', null),
  ('ms-garibay', 'Ms. Garibay', null),
  ('ms-aparicio', 'Ms. Aparicio', null),
  ('ms-dalton', 'Ms. Dalton', null),
  ('ms-romero', 'Ms. Romero', null),
  ('ms-najera', 'Ms. Najera', null),
  ('ms-rosas', 'Ms. Rosas', null),
  ('mr-j-pierce', 'Mr. J. Pierce', null),
  ('ms-rodriguez', 'Ms. Rodriguez', null),
  ('ms-pentangelo', 'Ms. Pentangelo', null),
  ('mr-hurtt', 'Mr. Hurtt', null),
  ('ms-ayme-johnson', 'Ms. Ayme-Johnson', null),
  ('mr-lazzeri', 'Mr. Lazzeri', null),
  ('dr-del-muro', 'Dr. Del Muro', null),
  ('ms-feix', 'Ms. Feix', null),
  ('ms-gwilliam', 'Ms. Gwilliam', null),
  ('mr-calero', 'Mr. Calero', null),
  ('dr-buckley', 'Dr. Buckley', null),
  ('mr-murphy', 'Mr. Murphy', null),
  ('ms-clark', 'Ms. Clark', null),
  ('mr-poullard', 'Mr. Poullard', null),
  ('ms-arnold', 'Ms. Arnold', null),
  ('ms-marquez', 'Ms. Marquez', null),
  ('ms-lopez-jaime', 'Ms. Lopez Jaime', null),
  ('mr-drulias', 'Mr. Drulias', null),
  ('ms-vasquez-campbell', 'Ms. Vasquez Campbell', null),
  ('ms-logasa', 'Ms. Logasa', null),
  ('ms-avina', 'Ms. Avina', null),
  ('mr-garcia', 'Mr. Garcia', null),
  ('ms-chacon', 'Ms. Chacon', null),
  ('ms-chen', 'Ms. Chen', null),
  ('ms-cho', 'Ms. Cho', null),
  ('ms-tenace', 'Ms. Tenace', null),
  ('ms-moskovitz', 'Ms. Moskovitz', null),
  ('mr-morgan', 'Mr. Morgan', null),
  ('mr-t-pierce', 'Mr. T. Pierce', null),
  ('ms-hacker', 'Ms. Hacker', null),
  ('ms-hempen', 'Ms. Hempen', null),
  ('mr-sorensen', 'Mr. Sorensen', null),
  ('ms-wai', 'Ms. Wai', null),
  ('ms-silver', 'Ms. Silver', null),
  ('mr-castaneda', 'Mr. Castaneda', null),
  ('mr-martin', 'Mr. Martin', null),
  ('ms-hebert', 'Ms. Hebert', null),
  ('mr-naranjo', 'Mr. Naranjo', null),
  ('ms-jensvold', 'Ms. Jensvold', null),
  ('ms-ho', 'Ms. Ho', null),
  ('mr-malveaux', 'Mr. Malveaux', null),
  ('ms-bravo', 'Ms. Bravo', null),
  ('mr-goya', 'Mr. Goya', null),
  ('mr-marquez', 'Mr. Marquez', null),
  ('ms-cooke', 'Ms. Cooke', null),
  ('ms-parra', 'Ms. Parra', null),
  ('ms-bevans', 'Ms. Bevans', null),
  ('mr-ghermezi', 'Mr. Ghermezi', null),
  ('mr-kuo', 'Mr. Kuo', null),
  ('mr-wiencek', 'Mr. Wiencek', null),
  ('dr-rizzo', 'Dr. Rizzo', null),
  ('mr-wells', 'Mr. Wells', null),
  ('ms-hernandez', 'Ms. Hernandez', null),
  ('ms-hansen', 'Ms. Hansen', null),
  ('ms-gonzalez', 'Ms. Gonzalez', null),
  ('mr-paulson', 'Mr. Paulson', null),
  ('ms-ku', 'Ms. Ku', null),
  ('ms-rudd', 'Ms. Rudd', null),
  ('ms-de-cambra', 'Ms. De Cambra', null),
  ('mr-kottke', 'Mr. Kottke', null),
  ('ms-daza', 'Ms. Daza', null),
  ('ms-baiz', 'Ms. Baiz', null),
  ('mr-mair', 'Mr. Mair', null),
  ('mr-bae', 'Mr. Bae', null),
  ('ms-thomas', 'Ms. Thomas', null),
  ('ms-razo', 'Ms. Razo', null),
  ('ms-riley', 'Ms. Riley', null),
  ('mr-langham', 'Mr. Langham', null),
  ('mr-kaitz', 'Mr. Kaitz', null),
  ('ms-dizon', 'Ms. Dizon', null),
  ('mr-jarvis', 'Mr. Jarvis', null),
  ('ms-santos', 'Ms. Santos', null),
  ('coach-berruecos', 'Coach Berruecos', null),
  ('coach-reitz', 'Coach Reitz', null),
  ('coach-shibley', 'Coach Shibley', null),
  ('coach-garcia', 'Coach Garcia', null)
on conflict (id) do update set name = excluded.name;

-- Rooms
insert into rooms (id, building_id, teacher_id, label) values
  ('201', 'bldg-200', 'mr-hwang', '201'),
  ('203', 'bldg-200', 'ms-chan', '203'),
  ('208', 'bldg-200', 'ms-tran', '208'),
  ('254', 'bldg-200', 'ms-mesdjian', '254'),
  ('256', 'bldg-200', 'mr-holbert', '256'),
  ('260', 'bldg-200', 'ms-delgado', '260'),
  ('262', 'bldg-200', 'ms-hostetler', '262'),
  ('263', 'bldg-200', null, '263'),
  ('265', 'bldg-200', 'mr-mesdjian', '265'),
  ('266', 'bldg-200', 'ms-newman', '266'),
  ('267', 'bldg-200', 'ms-buhain', '267'),
  ('271', 'bldg-200', 'mr-enriquez', '271'),
  ('276', 'bldg-200', 'ms-van-horn', '276'),
  ('301', 'bldg-300', 'ms-zavala', '301'),
  ('302', 'bldg-300', 'mr-navarro', '302'),
  ('303', 'bldg-300', 'mr-wu', '303'),
  ('304', 'bldg-300', 'ms-lu', '304'),
  ('305', 'bldg-300', 'ms-lee', '305'),
  ('307', 'bldg-300', null, '307'),
  ('308', 'bldg-300', 'ms-collier', '308'),
  ('309', 'bldg-300', 'ms-garibay', '309'),
  ('310', 'bldg-300', 'ms-aparicio', '310'),
  ('311', 'bldg-300', 'ms-dalton', '311'),
  ('312', 'bldg-300', null, '312'),
  ('352', 'bldg-300', null, '352'),
  ('353', 'bldg-300', 'ms-romero', '353'),
  ('354', 'bldg-300', 'ms-najera', '354'),
  ('355', 'bldg-300', 'ms-rosas', '355'),
  ('356', 'bldg-300', 'mr-j-pierce', '356'),
  ('357', 'bldg-300', 'ms-rodriguez', '357'),
  ('358', 'bldg-300', null, '358'),
  ('359', 'bldg-300', 'ms-pentangelo', '359'),
  ('360', 'bldg-300', 'mr-hurtt', '360'),
  ('361', 'bldg-300', 'ms-ayme-johnson', '361'),
  ('362', 'bldg-300', 'mr-lazzeri', '362'),
  ('401', 'bldg-400', 'dr-del-muro', '401'),
  ('402', 'bldg-400', 'ms-feix', '402'),
  ('403', 'bldg-400', 'ms-gwilliam', '403'),
  ('404', 'bldg-400', 'mr-calero', '404'),
  ('405', 'bldg-400', 'dr-buckley', '405'),
  ('407', 'bldg-400', 'mr-murphy', '407'),
  ('410', 'bldg-400', 'ms-clark', '410'),
  ('411', 'bldg-400', 'mr-poullard', '411'),
  ('412', 'bldg-400', 'ms-arnold', '412'),
  ('413', 'bldg-400', 'ms-marquez', '413'),
  ('414', 'bldg-400', 'ms-lopez-jaime', '414'),
  ('415', 'bldg-400', 'mr-drulias', '415'),
  ('416', 'bldg-400', 'ms-vasquez-campbell', '416'),
  ('417', 'bldg-400', 'ms-logasa', '417'),
  ('418', 'bldg-400', null, '418'),
  ('419', 'bldg-400', 'ms-avina', '419'),
  ('420', 'bldg-400', 'mr-garcia', '420'),
  ('451', 'bldg-400', 'ms-chacon', '451'),
  ('456', 'bldg-400', 'ms-chen', '456'),
  ('457', 'bldg-400', 'ms-cho', '457'),
  ('464', 'bldg-400', 'ms-tenace', '464'),
  ('465', 'bldg-400', 'ms-moskovitz', '465'),
  ('466', 'bldg-400', 'mr-morgan', '466'),
  ('467', 'bldg-400', 'ms-lee', '467'),
  ('501', 'bldg-500', 'mr-t-pierce', '501'),
  ('503', 'bldg-500', 'ms-hacker', '503'),
  ('504', 'bldg-500', 'ms-hempen', '504'),
  ('505', 'bldg-500', 'mr-sorensen', '505'),
  ('506', 'bldg-500', 'ms-wai', '506'),
  ('507', 'bldg-500', 'ms-silver', '507'),
  ('509', 'bldg-500', 'mr-castaneda', '509'),
  ('551', 'bldg-500', 'mr-martin', '551'),
  ('552', 'bldg-500', 'ms-hebert', '552'),
  ('555', 'bldg-500', 'mr-naranjo', '555'),
  ('559', 'bldg-500', 'ms-jensvold', '559'),
  ('560', 'bldg-500', 'ms-ho', '560'),
  ('561', 'bldg-500', 'mr-malveaux', '561'),
  ('562', 'bldg-500', 'ms-bravo', '562'),
  ('563', 'bldg-500', 'mr-goya', '563'),
  ('564', 'bldg-500', 'mr-marquez', '564'),
  ('565', 'bldg-500', 'ms-cooke', '565'),
  ('566', 'bldg-500', 'ms-parra', '566'),
  ('601', 'bldg-600', 'ms-bevans', '601'),
  ('602', 'bldg-600', 'mr-ghermezi', '602'),
  ('603', 'bldg-600', 'mr-kuo', '603'),
  ('604', 'bldg-600', 'mr-wiencek', '604'),
  ('605', 'bldg-600', 'dr-rizzo', '605'),
  ('606', 'bldg-600', 'mr-wells', '606'),
  ('607', 'bldg-600', 'ms-hernandez', '607'),
  ('608', 'bldg-600', 'ms-hansen', '608'),
  ('609', 'bldg-600', 'ms-gonzalez', '609'),
  ('610', 'bldg-600', 'mr-paulson', '610'),
  ('651', 'bldg-600', 'ms-ku', '651'),
  ('652', 'bldg-600', 'ms-rudd', '652'),
  ('653', 'bldg-600', 'ms-de-cambra', '653'),
  ('654', 'bldg-600', 'mr-kottke', '654'),
  ('655', 'bldg-600', 'ms-daza', '655'),
  ('656', 'bldg-600', 'ms-baiz', '656'),
  ('657', 'bldg-600', 'mr-mair', '657'),
  ('658', 'bldg-600', 'mr-bae', '658'),
  ('659', 'bldg-600', 'ms-thomas', '659'),
  ('660', 'bldg-600', 'ms-razo', '660'),
  ('903', 'bldg-900', 'ms-riley', '903'),
  ('904', 'bldg-900', 'mr-langham', '904'),
  ('907', 'bldg-900', 'mr-kaitz', '907'),
  ('908', 'bldg-900', 'mr-hwang', '908'),
  ('910', 'bldg-900', 'ms-dizon', '910'),
  ('911', 'bldg-900', 'ms-riley', '911'),
  ('912', 'bldg-900', 'mr-jarvis', '912'),
  ('1101', 'bldg-1100', 'ms-santos', '1101')
on conflict (id) do update set building_id = excluded.building_id, teacher_id = excluded.teacher_id, label = excluded.label;

-- Home rooms
update teachers set home_room_id = '201' where id = 'mr-hwang';
update teachers set home_room_id = '203' where id = 'ms-chan';
update teachers set home_room_id = '208' where id = 'ms-tran';
update teachers set home_room_id = '254' where id = 'ms-mesdjian';
update teachers set home_room_id = '256' where id = 'mr-holbert';
update teachers set home_room_id = '260' where id = 'ms-delgado';
update teachers set home_room_id = '262' where id = 'ms-hostetler';
update teachers set home_room_id = '265' where id = 'mr-mesdjian';
update teachers set home_room_id = '266' where id = 'ms-newman';
update teachers set home_room_id = '267' where id = 'ms-buhain';
update teachers set home_room_id = '271' where id = 'mr-enriquez';
update teachers set home_room_id = '276' where id = 'ms-van-horn';
update teachers set home_room_id = '301' where id = 'ms-zavala';
update teachers set home_room_id = '302' where id = 'mr-navarro';
update teachers set home_room_id = '303' where id = 'mr-wu';
update teachers set home_room_id = '304' where id = 'ms-lu';
update teachers set home_room_id = '305' where id = 'ms-lee';
update teachers set home_room_id = '308' where id = 'ms-collier';
update teachers set home_room_id = '309' where id = 'ms-garibay';
update teachers set home_room_id = '310' where id = 'ms-aparicio';
update teachers set home_room_id = '311' where id = 'ms-dalton';
update teachers set home_room_id = '353' where id = 'ms-romero';
update teachers set home_room_id = '354' where id = 'ms-najera';
update teachers set home_room_id = '355' where id = 'ms-rosas';
update teachers set home_room_id = '356' where id = 'mr-j-pierce';
update teachers set home_room_id = '357' where id = 'ms-rodriguez';
update teachers set home_room_id = '359' where id = 'ms-pentangelo';
update teachers set home_room_id = '360' where id = 'mr-hurtt';
update teachers set home_room_id = '361' where id = 'ms-ayme-johnson';
update teachers set home_room_id = '362' where id = 'mr-lazzeri';
update teachers set home_room_id = '401' where id = 'dr-del-muro';
update teachers set home_room_id = '402' where id = 'ms-feix';
update teachers set home_room_id = '403' where id = 'ms-gwilliam';
update teachers set home_room_id = '404' where id = 'mr-calero';
update teachers set home_room_id = '405' where id = 'dr-buckley';
update teachers set home_room_id = '407' where id = 'mr-murphy';
update teachers set home_room_id = '410' where id = 'ms-clark';
update teachers set home_room_id = '411' where id = 'mr-poullard';
update teachers set home_room_id = '412' where id = 'ms-arnold';
update teachers set home_room_id = '413' where id = 'ms-marquez';
update teachers set home_room_id = '414' where id = 'ms-lopez-jaime';
update teachers set home_room_id = '415' where id = 'mr-drulias';
update teachers set home_room_id = '416' where id = 'ms-vasquez-campbell';
update teachers set home_room_id = '417' where id = 'ms-logasa';
update teachers set home_room_id = '419' where id = 'ms-avina';
update teachers set home_room_id = '420' where id = 'mr-garcia';
update teachers set home_room_id = '451' where id = 'ms-chacon';
update teachers set home_room_id = '456' where id = 'ms-chen';
update teachers set home_room_id = '457' where id = 'ms-cho';
update teachers set home_room_id = '464' where id = 'ms-tenace';
update teachers set home_room_id = '465' where id = 'ms-moskovitz';
update teachers set home_room_id = '466' where id = 'mr-morgan';
update teachers set home_room_id = '501' where id = 'mr-t-pierce';
update teachers set home_room_id = '503' where id = 'ms-hacker';
update teachers set home_room_id = '504' where id = 'ms-hempen';
update teachers set home_room_id = '505' where id = 'mr-sorensen';
update teachers set home_room_id = '506' where id = 'ms-wai';
update teachers set home_room_id = '507' where id = 'ms-silver';
update teachers set home_room_id = '509' where id = 'mr-castaneda';
update teachers set home_room_id = '551' where id = 'mr-martin';
update teachers set home_room_id = '552' where id = 'ms-hebert';
update teachers set home_room_id = '555' where id = 'mr-naranjo';
update teachers set home_room_id = '559' where id = 'ms-jensvold';
update teachers set home_room_id = '560' where id = 'ms-ho';
update teachers set home_room_id = '561' where id = 'mr-malveaux';
update teachers set home_room_id = '562' where id = 'ms-bravo';
update teachers set home_room_id = '563' where id = 'mr-goya';
update teachers set home_room_id = '564' where id = 'mr-marquez';
update teachers set home_room_id = '565' where id = 'ms-cooke';
update teachers set home_room_id = '566' where id = 'ms-parra';
update teachers set home_room_id = '601' where id = 'ms-bevans';
update teachers set home_room_id = '602' where id = 'mr-ghermezi';
update teachers set home_room_id = '603' where id = 'mr-kuo';
update teachers set home_room_id = '604' where id = 'mr-wiencek';
update teachers set home_room_id = '605' where id = 'dr-rizzo';
update teachers set home_room_id = '606' where id = 'mr-wells';
update teachers set home_room_id = '607' where id = 'ms-hernandez';
update teachers set home_room_id = '608' where id = 'ms-hansen';
update teachers set home_room_id = '609' where id = 'ms-gonzalez';
update teachers set home_room_id = '610' where id = 'mr-paulson';
update teachers set home_room_id = '651' where id = 'ms-ku';
update teachers set home_room_id = '652' where id = 'ms-rudd';
update teachers set home_room_id = '653' where id = 'ms-de-cambra';
update teachers set home_room_id = '654' where id = 'mr-kottke';
update teachers set home_room_id = '655' where id = 'ms-daza';
update teachers set home_room_id = '656' where id = 'ms-baiz';
update teachers set home_room_id = '657' where id = 'mr-mair';
update teachers set home_room_id = '658' where id = 'mr-bae';
update teachers set home_room_id = '659' where id = 'ms-thomas';
update teachers set home_room_id = '660' where id = 'ms-razo';
update teachers set home_room_id = '903' where id = 'ms-riley';
update teachers set home_room_id = '904' where id = 'mr-langham';
update teachers set home_room_id = '907' where id = 'mr-kaitz';
update teachers set home_room_id = '910' where id = 'ms-dizon';
update teachers set home_room_id = '912' where id = 'mr-jarvis';
update teachers set home_room_id = '1101' where id = 'ms-santos';

-- Remove the old placeholder buildings/rooms/teachers.
update master_schedule set room_id = null where room_id in (select id from rooms where building_id in ('bldg-a','bldg-b','bldg-c'));
delete from rooms where building_id in ('bldg-a','bldg-b','bldg-c');
delete from buildings where id in ('bldg-a','bldg-b','bldg-c');
delete from teachers where name ilike 'placeholder%'
  and id not in (select teacher_id from rooms where teacher_id is not null)
  and id not in (select teacher_id from master_schedule where teacher_id is not null);

