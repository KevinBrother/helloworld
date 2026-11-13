package newchatmodelagent

import (
	"errors"
	"fmt"
	"io"

	"github.com/cloudwego/eino/adk"
	"github.com/cloudwego/eino/schema"
)

// printMessage consumes the message once: display chunks now, retain a complete
// message for the next turn. Calling GetMessage after Recv would reread a spent stream.
func printMessage(output io.Writer, variant *adk.MessageVariant) (*schema.Message, error) {
	if !variant.IsStreaming {
		if variant.Message == nil {
			return nil, fmt.Errorf("agent returned a nil message")
		}
		if _, err := io.WriteString(output, variant.Message.Content); err != nil {
			return nil, err
		}
		return variant.Message, nil
	}
	stream := variant.MessageStream
	if stream == nil {
		return nil, fmt.Errorf("agent returned a nil message stream")
	}
	defer stream.Close()
	var chunks []*schema.Message
	for {
		chunk, err := stream.Recv()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("receive message: %w", err)
		}
		if chunk == nil {
			continue
		}
		if _, err := io.WriteString(output, chunk.Content); err != nil {
			return nil, err
		}
		chunks = append(chunks, chunk)
	}
	if len(chunks) == 0 {
		return nil, fmt.Errorf("agent returned an empty message stream")
	}
	message, err := schema.ConcatMessages(chunks)
	if err != nil {
		return nil, fmt.Errorf("concat message: %w", err)
	}
	return message, nil
}
