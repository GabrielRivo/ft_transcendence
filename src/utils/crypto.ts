// WARNING: A mettre dans un common folder peut etre
import config from '../config.js';

import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

// promisify est une fonction qui permet de convertir une fonction callback en une fonction async
import { promisify } from 'node:util';

// le salt est generer aleatoirement a chaque hash mais donc si un dump est fait on peut utiliser le salt
// c pour ca qu'il y a aussi un "pepper", que l'on rajoute a serait une constante fixe qui permet de hasher le mot de passe qui office de double securite

// WARNING: voir raf integration vault
const pepper = config.crypto.pepper;

const scryptAsync = promisify(scrypt);

// bcrypt like mais on depasse ou mini equivalent...
// pour securiser plus je pourrais ajouter SCRYPT_OPTIONS qui permet de customiser encore plus scrypt pour complexifier et pas avoir les settings par defaut...

export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(config.crypto.saltLength).toString('hex');
	const derivedKey = (await scryptAsync(
		password + pepper,
		salt,
		config.crypto.keyLength,
	)) as Buffer;
	return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
	// prend salt generer lors du hash
	const [salt, key] = storedHash.split(':');
	if (!salt || !key) return false;

	const keyBuffer = Buffer.from(key, 'hex');
	// scrypt est une fonction qui permet de hasher un mot de passe
	// qu'est ce qui si passe derriere ? password est le mot de passe en clair, salt est le sel, 64 est la longueur de la clé dérivée

	const derivedKey = (await scryptAsync(
		password + pepper,
		salt,
		config.crypto.keyLength,
	)) as Buffer;

	// timingSafeEqual est une fonction qui permet de comparer deux bzuffers de manière sécurisée
	// en temps constant, ce qui permet d'éviter les attaques par timing attack
	// timing attack est une attaque qui consiste à mesurer le temps de réponse d'un système pour deviner le mot de passe
	// oui c possible xD

	// imagine que lettre par lettre son verifier, si invalide a le deuxieme lettre ca s'arrete
	// mais si valide jusqu'a la derniere lettre, ca va prendre plus de temps
	// ce que l'on peut en deduire si on se rapprocher ou pas

	// mais vue que c reelement hash salut et salud on tout meme une grosse difference qui peut etre deja faites a la premiere iteration
	// c plus utiliser dans une bonne pratique, l'attaque par timing attack et surtout utilisation dans la validation session / verification token...
	return timingSafeEqual(keyBuffer, derivedKey);
}

// ----------------------------- TOPT -------------------------

// malheuresement rien n'existe pour convertir un buffer en base3 nativement...
export function bufferToBase32(buffer: Buffer): string {
	const dic = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
	let bits = 0;
	let value = 0;
	let output = '';

	for (let i = 0; i < buffer.length; i++) {
		// ! pour dire que le buffer[i] est pas undefined
		// du style dire a typescript tkt tout va bien...
		value = (value << 8) | buffer[i]!;
		bits += 8;

		while (bits >= 5) {
			output += dic[(value >>> (bits - 5)) & 31];
			bits -= 5;
		}
	}

	if (bits > 0) {
		output += dic[(value << (5 - bits)) & 31];
	}

	return output;
}

export function base32ToBuffer(base32: string): Buffer {
	const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
	const cleaned = base32.toUpperCase().replace(/[\s=]/g, '');

	let bits = 0;
	let value = 0;
	const output: number[] = [];

	for (let i = 0; i < cleaned.length; i++) {
		const char = cleaned[i]!;
		const idx = alphabet.indexOf(char);

		if (idx === -1) {
			throw new Error(`Caractère Base32 invalide : ${char}`);
		}

		value = (value << 5) | idx;
		bits += 5;
		if (bits >= 8) {
			output.push((value >>> (bits - 8)) & 0xff);
			bits -= 8;
		}
	}

	return Buffer.from(output);
}

type TOTPAlgorithm = 'sha1' | 'sha256' | 'sha512';

export function getTOTP(
	secretBuffer: Buffer,
	pad = 6,
	timeWindow = 30,
	algorithm: TOTPAlgorithm = 'sha1',
): string {
	if (pad > 9) throw new Error('pad must be less than 10 (RFC 6238)');
	// intervalle depuis le 1er janvier 1970 de timeWindow, pour permettre de sync dans un de x secondes
	const counter = Math.floor(Date.now() / 1000 / timeWindow);

	// specificationn obligatoire pour HMAC
	const counterBuffer = Buffer.alloc(8);
	counterBuffer.writeBigInt64BE(BigInt(counter));

	// 3. Créer le HMAC-SHA1
	const hmac = createHmac(algorithm, secretBuffer);
	hmac.update(counterBuffer);
	const digest = hmac.digest();

	// on prend le dernier octet pour savoir où commencer à lire, permet de rajouter encore plus de complexite...
	// fait office de troncate dynamique car la fin prendre en plus une taille, fixe...
	const offset = digest[digest.length - 1]! & 0xf;

	// On lit 4 octets à partir de l'offset pour former un entier 32 bits
	const codeBits =
		((digest[offset]! & 0x7f) << 24) |
		((digest[offset + 1]! & 0xff) << 16) |
		((digest[offset + 2]! & 0xff) << 8) |
		(digest[offset + 3]! & 0xff);

	// permet de tronquer le code pour avoir la bonne taille, par exemple 6 chiffres
	const code = codeBits % Math.pow(10, pad);

	// On ajoute des zéros devant si besoin
	return code.toString().padStart(pad, '0');
}

// le choix par default est sha1, pourtant souvent reconnu comme faible,
// il pourtant utiliser par default pour tout les gestionnaire de TOPT, le probleme avec le sha1 est les collisions mais ici on s'enfou totalement des collision et surtout duree vie de x secondes...
// surtout sha1 est le plus rapide et le plus compatible...

export function generateTOTPSecret(length = 20): Buffer {
	return randomBytes(length);
}

export function linkTOTPSecret(
	secret: Buffer,
	issuer: string,
	label: string,
	algorithm: TOTPAlgorithm = 'sha1',
	pad = 6,
	timeWindow = 30,
): string {
	return (
		'otpauth://totp/' +
		issuer +
		':' +
		label +
		'?secret=' +
		bufferToBase32(secret) +
		'&issuer=' +
		issuer +
		'&algorithm=' +
		algorithm +
		'&digits=' +
		pad +
		'&period=' +
		timeWindow
	);
}

export function verifyTOTP(
	secret: Buffer,
	code: string,
	pad = 6,
	timeWindow = 30,
	algorithm: TOTPAlgorithm = 'sha1',
): boolean {
	return getTOTP(secret, pad, timeWindow, algorithm) === code;
}
