const { sql } = require("../database/mariadb");

class Cert {
  email = "";
  password = "";
  constructor(data) {
    const { email, password } = data;
    email && (this.email = email);
    password && (this.password = password);
  }

  getCertifications() {
    const cert = {
      email: this.email,
      password: this.password,
    };
    return Object.fromEntries(Object.entries(cert).filter(([k, v]) => v));
  }
}

class Agreements extends Cert {
  service = false;
  marketing = false;
  personal = false;
  constructor(data) {
    const { service, marketing, personal } = data;
    super(data);
    service !== undefined && (this.service = service);
    marketing !== undefined && (this.marketing = marketing);
    personal !== undefined && (this.personal = personal);
  }

  getAgreements() {
    const grees = {
      service: this.service,
      marketing: this.marketing,
      personal: this.personal,
    };
    return Object.fromEntries(Object.entries(grees).filter(([k, v]) => v));
  }
}

class Location extends Agreements {
  server = 1;
  authority = "";
  type = "";
  state = "";
  avatar = "";
  space = "";
  pox = 0;
  poy = 0;
  poz = 0;
  roy = 0;

  constructor(data) {
    const {
      server,
      authority,
      type,
      state,
      avatar,
      space,
      pox,
      poy,
      poz,
      roy,
    } = data;
    super(data);
    server && (this.server = server);
    authority && (this.authority = authority);
    type && (this.type = type);
    state && (this.state = state);
    avatar && (this.avatar = avatar);
    space && (this.space = space);
    pox && (this.pox = pox);
    poy && (this.poy = poy);
    poz && (this.poz = poz);
    roy && (this.roy = roy);
  }

  getLocation() {
    const location = {
      server: this.server,
      authority: this.authority,
      type: this.type,
      state: this.state,
      avatar: this.avatar,
      space: this.space,
      pox: this.pox,
      poy: this.poy,
      poz: this.poz,
      roy: this.roy,
    };
    return Object.fromEntries(Object.entries(location).filter(([k, v]) => v));
  }
}

class Base extends Location {
  id = 0;
  nickname = "";
  email = "";
  password = "";
  age = new Date().format("YYYY-MM-ddTHH:mm:ss");
  birth = new Date().format("YYYY-MM-ddTHH:mm:ss");
  nation = "";
  created_at = new Date().format("YYYY-MM-ddTHH:mm:ss");
  updated_at = new Date().format("YYYY-MM-ddTHH:mm:ss");
  constructor(data) {
    const {
      id,
      nickname,
      email,
      password,
      age,
      birth,
      nation,
      created_at,
      updated_at,
    } = data;
    super(data);
    id && (this.id = id);
    nickname && (this.nickname = nickname);
    email && (this.email = email);
    password && (this.password = password);
    age && (this.age = age);
    birth && (this.birth = birth);
    nation && (this.nation = nation);
    created_at && (this.created_at = created_at);
    updated_at && (this.updated_at = updated_at);
  }

  getBaseInfo() {
    return {
      id: this.id,
      nickname: this.nickname,
      email: this.email,
      password: this.password,
      age: this.age,
      birth: this.birth,
      nation: this.nation,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  toJson() {
    return Object.fromEntries(Object.entries(this));
  }
}

exports.User = class User extends Base {};
exports.Locations = Location;
exports.Agreements = Agreements;
exports.Cert = Cert;
