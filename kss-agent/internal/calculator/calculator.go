// Package calculator evaluates arithmetic expressions with a small,
// dependency-free recursive-descent parser. It is intentionally not an
// interpreter: there are no variables, no assignment and no side effects.
package calculator

import (
	"fmt"
	"math"
	"strconv"
	"strings"
	"unicode"
	"unicode/utf8"
)

const (
	// maxExpressionBytes bounds the raw input size.
	maxExpressionBytes = 512
	// maxNestingDepth bounds parentheses and call nesting.
	maxNestingDepth = 64
)

// Evaluate parses and evaluates one arithmetic expression.
//
// Supported grammar: + - * / % ^ (right-associative), unary signs,
// parentheses, the constants pi and e, and the functions sqrt, abs, floor,
// ceil, round, min, max and pow. Errors include the byte offset of the
// offending token when one is available.
func Evaluate(expression string) (float64, error) {
	if len(expression) > maxExpressionBytes {
		return 0, fmt.Errorf("expression too long: %d bytes (max %d)", len(expression), maxExpressionBytes)
	}
	p := &parser{input: expression}
	if err := p.next(); err != nil {
		return 0, err
	}
	if p.tok.kind == tokenEOF {
		return 0, fmt.Errorf("empty expression")
	}
	value, err := p.expr()
	if err != nil {
		return 0, err
	}
	if p.tok.kind != tokenEOF {
		return 0, fmt.Errorf("unexpected token %q at %d", p.tok.text, p.tok.pos)
	}
	if math.IsNaN(value) {
		return 0, fmt.Errorf("result is not a number")
	}
	if math.IsInf(value, 0) {
		return 0, fmt.Errorf("result overflow")
	}
	return value, nil
}

type tokenKind int

const (
	tokenEOF tokenKind = iota
	tokenNumber
	tokenIdent
	tokenOperator
	tokenLParen
	tokenRParen
	tokenComma
)

type token struct {
	kind tokenKind
	text string
	num  float64
	pos  int
}

type parser struct {
	input string
	pos   int
	tok   token
	depth int
}

func (p *parser) next() error {
	for p.pos < len(p.input) {
		r, size := rune(p.input[p.pos]), 1
		if r >= 0x80 {
			r, size = decodeRune(p.input[p.pos:])
		}
		if unicode.IsSpace(r) {
			p.pos += size
			continue
		}
		break
	}
	if p.pos >= len(p.input) {
		p.tok = token{kind: tokenEOF, pos: p.pos}
		return nil
	}
	start := p.pos
	r, size := rune(p.input[p.pos]), 1
	if r >= 0x80 {
		r, size = decodeRune(p.input[p.pos:])
	}
	switch {
	case r == '.' || unicode.IsDigit(r):
		return p.scanNumber(start)
	case r == '_' || unicode.IsLetter(r):
		p.pos += size
		for p.pos < len(p.input) {
			r2, s2 := rune(p.input[p.pos]), 1
			if r2 >= 0x80 {
				r2, s2 = decodeRune(p.input[p.pos:])
			}
			if r2 == '_' || unicode.IsLetter(r2) || unicode.IsDigit(r2) {
				p.pos += s2
				continue
			}
			break
		}
		p.tok = token{kind: tokenIdent, text: p.input[start:p.pos], pos: start}
		return nil
	case strings.ContainsRune("+-*/%^", r):
		p.pos += size
		p.tok = token{kind: tokenOperator, text: string(r), pos: start}
		return nil
	case r == '(':
		p.pos += size
		p.tok = token{kind: tokenLParen, text: "(", pos: start}
		return nil
	case r == ')':
		p.pos += size
		p.tok = token{kind: tokenRParen, text: ")", pos: start}
		return nil
	case r == ',':
		p.pos += size
		p.tok = token{kind: tokenComma, text: ",", pos: start}
		return nil
	default:
		return fmt.Errorf("invalid character %q at %d", r, start)
	}
}

func decodeRune(s string) (rune, int) { return utf8.DecodeRuneInString(s) }

func (p *parser) scanNumber(start int) error {
	if p.pos < len(p.input) && p.input[p.pos] == '.' {
		p.pos++
		for p.pos < len(p.input) && isDigit(p.input[p.pos]) {
			p.pos++
		}
	} else {
		for p.pos < len(p.input) && isDigit(p.input[p.pos]) {
			p.pos++
		}
		if p.pos < len(p.input) && p.input[p.pos] == '.' {
			p.pos++
			for p.pos < len(p.input) && isDigit(p.input[p.pos]) {
				p.pos++
			}
		}
	}
	if p.pos < len(p.input) && (p.input[p.pos] == 'e' || p.input[p.pos] == 'E') {
		next := p.pos + 1
		if next < len(p.input) && (p.input[next] == '+' || p.input[next] == '-') {
			next++
		}
		if next < len(p.input) && isDigit(p.input[next]) {
			p.pos = next
			for p.pos < len(p.input) && isDigit(p.input[p.pos]) {
				p.pos++
			}
		}
	}
	text := p.input[start:p.pos]
	value, err := strconv.ParseFloat(text, 64)
	if err != nil {
		if numErr, ok := err.(*strconv.NumError); ok && numErr.Err == strconv.ErrRange {
			return fmt.Errorf("number out of range at %d", start)
		}
		return fmt.Errorf("invalid number %q at %d", text, start)
	}
	if math.IsInf(value, 0) {
		return fmt.Errorf("number out of range at %d", start)
	}
	p.tok = token{kind: tokenNumber, text: text, num: value, pos: start}
	return nil
}

func isDigit(b byte) bool { return b >= '0' && b <= '9' }

func (p *parser) expr() (float64, error) {
	left, err := p.term()
	if err != nil {
		return 0, err
	}
	for p.tok.kind == tokenOperator && (p.tok.text == "+" || p.tok.text == "-") {
		op := p.tok.text
		if err := p.next(); err != nil {
			return 0, err
		}
		right, err := p.term()
		if err != nil {
			return 0, err
		}
		if op == "+" {
			left += right
		} else {
			left -= right
		}
		if math.IsInf(left, 0) {
			return 0, fmt.Errorf("arithmetic overflow")
		}
	}
	return left, nil
}

func (p *parser) term() (float64, error) {
	left, err := p.unary()
	if err != nil {
		return 0, err
	}
	for p.tok.kind == tokenOperator && (p.tok.text == "*" || p.tok.text == "/" || p.tok.text == "%") {
		op := p.tok.text
		if err := p.next(); err != nil {
			return 0, err
		}
		right, err := p.unary()
		if err != nil {
			return 0, err
		}
		switch op {
		case "*":
			left *= right
		case "/":
			if right == 0 {
				return 0, fmt.Errorf("division by zero")
			}
			left /= right
		case "%":
			if right == 0 {
				return 0, fmt.Errorf("division by zero")
			}
			left = math.Mod(left, right)
		}
		if math.IsInf(left, 0) {
			return 0, fmt.Errorf("arithmetic overflow")
		}
	}
	return left, nil
}

func (p *parser) unary() (float64, error) {
	if p.tok.kind == tokenOperator && (p.tok.text == "+" || p.tok.text == "-") {
		negative := p.tok.text == "-"
		if err := p.next(); err != nil {
			return 0, err
		}
		value, err := p.unary()
		if err != nil {
			return 0, err
		}
		if negative {
			return -value, nil
		}
		return value, nil
	}
	return p.power()
}

func (p *parser) power() (float64, error) {
	base, err := p.primary()
	if err != nil {
		return 0, err
	}
	if p.tok.kind == tokenOperator && p.tok.text == "^" {
		if err := p.next(); err != nil {
			return 0, err
		}
		exponent, err := p.unary()
		if err != nil {
			return 0, err
		}
		value := math.Pow(base, exponent)
		if math.IsInf(value, 0) {
			return 0, fmt.Errorf("arithmetic overflow")
		}
		return value, nil
	}
	return base, nil
}

func (p *parser) primary() (float64, error) {
	switch p.tok.kind {
	case tokenNumber:
		value := p.tok.num
		return value, p.next()
	case tokenIdent:
		name := p.tok.text
		pos := p.tok.pos
		if err := p.next(); err != nil {
			return 0, err
		}
		if p.tok.kind == tokenLParen {
			return p.call(name, pos)
		}
		switch strings.ToLower(name) {
		case "pi":
			return math.Pi, nil
		case "e":
			return math.E, nil
		}
		return 0, fmt.Errorf("unknown identifier %q at %d", name, pos)
	case tokenLParen:
		if err := p.enter(); err != nil {
			return 0, err
		}
		if err := p.next(); err != nil {
			return 0, err
		}
		value, err := p.expr()
		if err != nil {
			return 0, err
		}
		if p.tok.kind == tokenEOF {
			return 0, fmt.Errorf("unexpected end of expression")
		}
		if p.tok.kind != tokenRParen {
			return 0, fmt.Errorf("expected \")\" at %d", p.tok.pos)
		}
		p.depth--
		return value, p.next()
	case tokenEOF:
		return 0, fmt.Errorf("unexpected end of expression")
	default:
		return 0, fmt.Errorf("unexpected token %q at %d", p.tok.text, p.tok.pos)
	}
}

func (p *parser) enter() error {
	p.depth++
	if p.depth > maxNestingDepth {
		return fmt.Errorf("expression is nested too deeply (max %d)", maxNestingDepth)
	}
	return nil
}

func (p *parser) call(name string, pos int) (float64, error) {
	if err := p.enter(); err != nil {
		return 0, err
	}
	if err := p.next(); err != nil { // consume '('
		return 0, err
	}
	var args []float64
	if p.tok.kind != tokenRParen {
		for {
			value, err := p.expr()
			if err != nil {
				return 0, err
			}
			args = append(args, value)
			if p.tok.kind == tokenComma {
				if err := p.next(); err != nil {
					return 0, err
				}
				continue
			}
			break
		}
	}
	if p.tok.kind != tokenRParen {
		return 0, fmt.Errorf("expected \")\" at %d", p.tok.pos)
	}
	p.depth--
	if err := p.next(); err != nil { // consume ')'
		return 0, err
	}
	return applyFunction(strings.ToLower(name), pos, args)
}

func applyFunction(name string, pos int, args []float64) (float64, error) {
	want := func(n int) error {
		if len(args) != n {
			if n == 1 {
				return fmt.Errorf("%s: expects 1 argument", name)
			}
			return fmt.Errorf("%s: expects %d arguments", name, n)
		}
		return nil
	}
	var value float64
	switch name {
	case "sqrt":
		if err := want(1); err != nil {
			return 0, err
		}
		value = math.Sqrt(args[0])
	case "abs":
		if err := want(1); err != nil {
			return 0, err
		}
		value = math.Abs(args[0])
	case "floor":
		if err := want(1); err != nil {
			return 0, err
		}
		value = math.Floor(args[0])
	case "ceil":
		if err := want(1); err != nil {
			return 0, err
		}
		value = math.Ceil(args[0])
	case "round":
		if err := want(1); err != nil {
			return 0, err
		}
		value = math.Round(args[0])
	case "pow":
		if err := want(2); err != nil {
			return 0, err
		}
		value = math.Pow(args[0], args[1])
	case "min":
		if len(args) < 1 {
			return 0, fmt.Errorf("min: expects at least 1 argument")
		}
		value = args[0]
		for _, arg := range args[1:] {
			value = math.Min(value, arg)
		}
	case "max":
		if len(args) < 1 {
			return 0, fmt.Errorf("max: expects at least 1 argument")
		}
		value = args[0]
		for _, arg := range args[1:] {
			value = math.Max(value, arg)
		}
	default:
		return 0, fmt.Errorf("unknown function %q at %d", name, pos)
	}
	if math.IsNaN(value) {
		return 0, fmt.Errorf("%s: result is not a number", name)
	}
	if math.IsInf(value, 0) {
		return 0, fmt.Errorf("%s: result overflow", name)
	}
	return value, nil
}
